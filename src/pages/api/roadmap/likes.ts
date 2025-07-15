import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from "@supabase/ssr";

function getCookiesFromReq(req: NextApiRequest) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return [] as { name: string; value: string }[];
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") } as { name: string; value: string };
  });
}

function createSupabaseServerClient(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getCookiesFromReq(req);
        },
        setAll(cookies) {
          cookies.forEach(({ name, value }) => {
            res.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly`);
          });
        },
      },
    }
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createSupabaseServerClient(req, res);

  if (req.method === 'GET') {
    try {
      const { postId } = req.query;

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      const { data: likes, error } = await supabase
        .from('roadmap_likes')
        .select('user_id')
        .eq('post_id', postId);

      if (error) {
        console.error('Error fetching likes:', error);
        return res.status(500).json({ error: 'Failed to fetch likes' });
      }

      const likeCount = likes?.length || 0;

      const { data: session } = await supabase.auth.getUser();
      const currentUserId = session.user?.id;

      const userHasLiked = currentUserId ? likes?.some((like) => like.user_id === currentUserId) : false;

      res.status(200).json({
        count: likeCount,
        userHasLiked
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { postId } = req.body;

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const userId = user.id;

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      // Check if user has already liked this post
      const { data: existingLike } = await supabase
        .from('roadmap_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (existingLike) {
        return res.status(400).json({ error: 'Post already liked' });
      }

      // Create the like
      const { error: insertError } = await supabase
        .from('roadmap_likes')
        .insert({
          post_id: postId,
          user_id: userId
        });

      if (insertError) {
        console.error('Error creating like:', insertError);
        return res.status(500).json({ error: 'Failed to like post' });
      }

      // Get updated like count
      const { data: likes, error: countError } = await supabase
        .from('roadmap_likes')
        .select('user_id')
        .eq('post_id', postId);

      if (countError) {
        console.error('Error fetching updated likes:', countError);
        return res.status(500).json({ error: 'Failed to fetch updated likes' });
      }

      res.status(201).json({
        count: likes?.length || 0,
        userHasLiked: true
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { postId } = req.query;

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const userId = user.id;

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      // Delete the like
      const { error } = await supabase
        .from('roadmap_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting like:', error);
        return res.status(500).json({ error: 'Failed to unlike post' });
      }

      // Get updated like count
      const { data: likes, error: countError } = await supabase
        .from('roadmap_likes')
        .select('user_id')
        .eq('post_id', postId);

      if (countError) {
        console.error('Error fetching updated likes:', countError);
        return res.status(500).json({ error: 'Failed to fetch updated likes' });
      }

      res.status(200).json({
        count: likes?.length || 0,
        userHasLiked: false
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
} 