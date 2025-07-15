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
      const { tag, status } = req.query;
      
      let query = supabase
        .from('roadmap_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (tag && tag !== 'all') {
        query = query.eq('tag', tag);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: posts, error } = await query;

      if (error) {
        console.error('Error fetching roadmap posts:', error);
        return res.status(500).json({ error: 'Failed to fetch roadmap posts' });
      }

      // Get like counts for each post
      const postsWithCounts = [];
      for (const post of posts || []) {
        // Get like count for this post
        const { data: likes } = await supabase
          .from('roadmap_likes')
          .select('user_id')
          .eq('post_id', post.id);

        // Get creator username
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', post.created_by)
          .single();

        // Get last editor username if different from creator
        let lastEditorProfile = null;
        if (post.last_edited_by && post.last_edited_by !== post.created_by) {
          const { data: editorProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', post.last_edited_by)
            .single();
          lastEditorProfile = editorProfile;
        }

        postsWithCounts.push({
          ...post,
          like_count: likes?.length || 0,
          profiles: creatorProfile,
          last_editor: lastEditorProfile
        });
      }

      res.status(200).json(postsWithCounts);
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, tag } = req.body;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = user.id;

      if (!title || !tag) {
        return res.status(400).json({ error: 'Title and tag are required' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User ID is required' });
      }

      const { data: post, error } = await supabase
        .from('roadmap_posts')
        .insert({
          title: title.trim(),
          description: description?.trim() || null,
          tag,
          created_by: userId,
          last_edited_by: userId
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating roadmap post:', error);
        return res.status(500).json({ error: 'Failed to create roadmap post' });
      }

      // Get creator profile
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      res.status(201).json({ 
        ...post, 
        like_count: 0,
        profiles: creatorProfile,
        last_editor: null
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, title, description, tag, status, priority } = req.body;

      const { data: session } = await supabase.auth.getUser();
      const user = session.user;

      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const userId = user.id;

      // Check if user is admin for status/priority changes
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      const isAdmin = userProfile?.username === 'davidronnlidmh';

      const updateData: any = {
        last_edited_by: userId,
        updated_at: new Date().toISOString()
      };

      // Anyone can edit title, description, and tag
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (tag !== undefined) updateData.tag = tag;

      // Only admin can edit status and priority
      if (status !== undefined) {
        if (isAdmin) {
          updateData.status = status;
        } else {
          return res.status(403).json({ error: 'Only admin can change status' });
        }
      }

      if (priority !== undefined) {
        if (isAdmin) {
          updateData.priority = priority;
        } else {
          return res.status(403).json({ error: 'Only admin can change priority' });
        }
      }

      const { data: post, error } = await supabase
        .from('roadmap_posts')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating roadmap post:', error);
        return res.status(500).json({ error: 'Failed to update roadmap post' });
      }

      // Get like count
      const { data: likes } = await supabase
        .from('roadmap_likes')
        .select('user_id')
        .eq('post_id', post.id);

      // Get creator profile
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', post.created_by)
        .single();

      // Get last editor profile if different from creator
      let lastEditorProfile = null;
      if (post.last_edited_by && post.last_edited_by !== post.created_by) {
        const { data: editorProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', post.last_edited_by)
          .single();
        lastEditorProfile = editorProfile;
      }

      const postWithCount = {
        ...post,
        like_count: likes?.length || 0,
        profiles: creatorProfile,
        last_editor: lastEditorProfile
      };

      res.status(200).json(postWithCount);
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Ensure the user is either the creator or admin
      const { data: postRow, error: fetchErr } = await supabase
        .from("roadmap_posts")
        .select("created_by")
        .eq("id", id)
        .single();

      if (fetchErr || !postRow) {
        return res.status(404).json({ error: "Post not found" });
      }

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const isAdmin = userProfile?.username === "davidronnlidmh";

      if (!isAdmin && postRow.created_by !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { error } = await supabase
        .from('roadmap_posts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting roadmap post:', error);
        return res.status(500).json({ error: 'Failed to delete roadmap post' });
      }

      res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
} 