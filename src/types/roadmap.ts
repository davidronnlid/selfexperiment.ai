export interface RoadmapPost {
  id: string;
  title: string;
  description?: string;
  tag: 'Analytics' | 'Log Now' | 'Log Routines' | 'Community';
  status: 'proposed' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  created_by: string;
  last_edited_by: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
  };
  last_editor?: {
    username: string;
  };
  like_count: number;
  comment_count?: number;
}

export interface RoadmapLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface RoadmapEditHistory {
  id: string;
  post_id: string;
  edited_by: string;
  field_changed: string;
  old_value?: string;
  new_value?: string;
  change_reason?: string;
  created_at: string;
}

export interface RoadmapComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
  };
}

export interface CreateRoadmapCommentRequest {
  post_id: string;
  content: string;
}

export interface UpdateRoadmapCommentRequest {
  id: string;
  content: string;
}

export interface CreateRoadmapPostRequest {
  title: string;
  description?: string;
  tag: 'Analytics' | 'Log Now' | 'Log Routines' | 'Community';
}

export interface UpdateRoadmapPostRequest {
  id: string;
  title?: string;
  description?: string;
  tag?: 'Analytics' | 'Log Now' | 'Log Routines' | 'Community';
  status?: 'proposed' | 'in_progress' | 'completed' | 'rejected';
  priority?: 'low' | 'medium' | 'high';
}

export interface RoadmapLikeInfo {
  count: number;
  userHasLiked: boolean;
} 