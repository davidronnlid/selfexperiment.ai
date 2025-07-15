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
  const { method } = req;

  if (method === 'GET') {
    // Fetch comments for a post
    const { postId } = req.query;

    if (!postId) {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    try {
      // First check if the table exists
      const { data: tableExists, error: tableCheckError } = await supabase
        .from('roadmap_comments')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        console.error('Table does not exist or is not accessible:', tableCheckError);
        return res.status(200).json({ comments: [] });
      }

      const { data: comments, error } = await supabase
        .from('roadmap_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return res.status(500).json({ error: 'Failed to fetch comments' });
      }

      // Fetch usernames separately if comments exist
      if (comments && comments.length > 0) {
        const userIds = [...new Set(comments.map(c => c.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        if (!profilesError && profiles) {
          const profileMap = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile.username;
            return acc;
          }, {} as Record<string, string>);

          // Add usernames to comments
          const commentsWithProfiles = comments.map(comment => ({
            ...comment,
            profiles: { username: profileMap[comment.user_id] || 'Unknown' }
          }));

          return res.status(200).json({ comments: commentsWithProfiles });
        }
      }

      return res.status(200).json({ comments: comments || [] });
    } catch (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  if (method === 'POST') {
    // Create a new comment
    const { post_id, content } = req.body;

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = user.id;

    if (!post_id || !content || !userId) {
      return res.status(400).json({ error: 'Post ID, content, and user ID are required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Comment is too long (max 2000 characters)' });
    }

    try {
      const { data: comment, error } = await supabase
        .from('roadmap_comments')
        .insert([
          {
            post_id,
            user_id: userId,
            content: content.trim(),
          },
        ])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating comment:', error);
        return res.status(500).json({ error: 'Failed to create comment' });
      }

      // Fetch username for the new comment
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      const commentWithProfile = {
        ...comment,
        profiles: { username: profile?.username || 'Unknown' }
      };

      return res.status(201).json({ comment: commentWithProfile });
    } catch (error) {
      console.error('Error creating comment:', error);
      return res.status(500).json({ error: 'Failed to create comment' });
    }
  }

  if (method === 'PUT') {
    // Update a comment
    const { id, content } = req.body;

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = user.id;

    if (!id || !content || !userId) {
      return res.status(400).json({ error: 'Comment ID, content, and user ID are required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Comment is too long (max 2000 characters)' });
    }

    try {
      // First, check if the comment exists and belongs to the user
      const { data: existingComment, error: fetchError } = await supabase
        .from('roadmap_comments')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingComment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (existingComment.user_id !== userId) {
        return res.status(403).json({ error: 'You can only edit your own comments' });
      }

      const { data: comment, error } = await supabase
        .from('roadmap_comments')
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating comment:', error);
        return res.status(500).json({ error: 'Failed to update comment' });
      }

      // Fetch username for the updated comment
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      const commentWithProfile = {
        ...comment,
        profiles: { username: profile?.username || 'Unknown' }
      };

      return res.status(200).json({ comment: commentWithProfile });
    } catch (error) {
      console.error('Error updating comment:', error);
      return res.status(500).json({ error: 'Failed to update comment' });
    }
  }

  if (method === 'DELETE') {
    // Delete a comment
    const { id } = req.body;

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = user.id;

    if (!id || !userId) {
      return res.status(400).json({ error: 'Comment ID and user ID are required' });
    }

    try {
      // First, check if the comment exists and belongs to the user
      const { data: existingComment, error: fetchError } = await supabase
        .from('roadmap_comments')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingComment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (existingComment.user_id !== userId) {
        return res.status(403).json({ error: 'You can only delete your own comments' });
      }

      const { error } = await supabase
        .from('roadmap_comments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting comment:', error);
        return res.status(500).json({ error: 'Failed to delete comment' });
      }

      return res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 