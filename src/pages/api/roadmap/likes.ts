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
      const { postId, userId } = req.query;

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      const { data: likes, error } = await supabaseAdmin
        .from('roadmap_likes')
        .select('user_id')
        .eq('post_id', postId);

      if (error) {
        console.error('Error fetching likes:', error);
        return res.status(500).json({ error: 'Failed to fetch likes' });
      }

      const likeCount = likes?.length || 0;
      const userHasLiked = userId ? likes?.some(like => like.user_id === userId) : false;

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
      const { postId, userId } = req.body;

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User ID is required' });
      }

      // Check if user has already liked this post
      const { data: existingLike } = await supabaseAdmin
        .from('roadmap_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (existingLike) {
        return res.status(400).json({ error: 'Post already liked' });
      }

      // Create the like
      const { error: insertError } = await supabaseAdmin
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
      const { data: likes, error: countError } = await supabaseAdmin
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
      const { postId, userId } = req.query;

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User ID is required' });
      }

      // Delete the like
      const { error } = await supabaseAdmin
        .from('roadmap_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting like:', error);
        return res.status(500).json({ error: 'Failed to unlike post' });
      }

      // Get updated like count
      const { data: likes, error: countError } = await supabaseAdmin
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