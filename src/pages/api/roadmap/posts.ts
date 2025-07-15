import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/utils/supaBase';
import { createClient } from '@supabase/supabase-js';

// Create a service role client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { tag, status } = req.query;
      
      let query = supabaseAdmin
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
        const { data: likes } = await supabaseAdmin
          .from('roadmap_likes')
          .select('user_id')
          .eq('post_id', post.id);

        // Get creator username
        const { data: creatorProfile } = await supabaseAdmin
          .from('profiles')
          .select('username')
          .eq('id', post.created_by)
          .single();

        // Get last editor username if different from creator
        let lastEditorProfile = null;
        if (post.last_edited_by && post.last_edited_by !== post.created_by) {
          const { data: editorProfile } = await supabaseAdmin
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
      const { title, description, tag, userId } = req.body;

      if (!title || !tag) {
        return res.status(400).json({ error: 'Title and tag are required' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User ID is required' });
      }

      const { data: post, error } = await supabaseAdmin
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
      const { data: creatorProfile } = await supabaseAdmin
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
      const { id, title, description, tag, status, priority, userId } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User ID is required' });
      }

      // Check if user is admin for status/priority changes
      const { data: userProfile } = await supabaseAdmin
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

      const { data: post, error } = await supabaseAdmin
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
      const { data: likes } = await supabaseAdmin
        .from('roadmap_likes')
        .select('user_id')
        .eq('post_id', post.id);

      // Get creator profile
      const { data: creatorProfile } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('id', post.created_by)
        .single();

      // Get last editor profile if different from creator
      let lastEditorProfile = null;
      if (post.last_edited_by && post.last_edited_by !== post.created_by) {
        const { data: editorProfile } = await supabaseAdmin
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

      if (!id) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      const { error } = await supabaseAdmin
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