import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Card,
  CardContent,
  Alert,
} from "@mui/material";
import {
  Comment as CommentIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import {
  RoadmapComment,
  CreateRoadmapCommentRequest,
  UpdateRoadmapCommentRequest,
} from "@/types/roadmap";
import { useUser } from "@/pages/_app";

interface RoadmapCommentsProps {
  postId: string;
  commentCount?: number;
  onCommentCountChange?: (count: number) => void;
}

export default function RoadmapComments({
  postId,
  commentCount = 0,
  onCommentCountChange,
}: RoadmapCommentsProps) {
  const { user, username } = useUser();
  const [comments, setComments] = useState<RoadmapComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<RoadmapComment | null>(
    null
  );
  const [editCommentContent, setEditCommentContent] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments
  const fetchComments = async () => {
    if (!commentsVisible) return;

    setLoading(true);
    setError(null);
    try {
      console.log("Fetching comments for post:", postId);
      const response = await fetch(`/api/roadmap/comments?postId=${postId}`);
      const data = await response.json();

      if (response.ok) {
        console.log("Comments fetched:", data.comments);
        setComments(data.comments || []);
        onCommentCountChange?.(data.comments?.length || 0);
      } else {
        console.error("Error response:", data);
        setError(data.error || "Failed to fetch comments");
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      setError("Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  };

  // Fetch comment count even when comments are not visible
  const fetchCommentCount = async () => {
    try {
      const response = await fetch(`/api/roadmap/comments?postId=${postId}`);
      const data = await response.json();

      if (response.ok) {
        onCommentCountChange?.(data.comments?.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch comment count:", error);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [commentsVisible, postId]);

  // Fetch comment count on component mount (even when comments not visible)
  useEffect(() => {
    fetchCommentCount();
  }, [postId]);

  // Update parent component with current comment count whenever comments change
  useEffect(() => {
    onCommentCountChange?.(comments.length);
  }, [comments.length, onCommentCountChange]);

  // Create comment
  const handleCreateComment = async () => {
    if (!user || !newComment.trim()) return;

    setSubmitLoading(true);
    setError(null);
    try {
      const commentData: CreateRoadmapCommentRequest = {
        post_id: postId,
        content: newComment.trim(),
      };

      console.log("Creating comment:", commentData);
      const response = await fetch("/api/roadmap/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...commentData, userId: user.id }),
      });

      const data = await response.json();
      console.log("Create comment response:", data);

      if (response.ok) {
        setNewComment("");
        // Add the new comment to the state immediately for better UX
        if (data.comment) {
          setComments((prev) => [...prev, data.comment]);
          onCommentCountChange?.(comments.length + 1);
        }
        // Also fetch to ensure we have the latest data
        await fetchComments();
      } else {
        console.error("Failed to create comment:", data);
        setError(data.error || "Failed to create comment");
      }
    } catch (error) {
      console.error("Error creating comment:", error);
      setError("Failed to create comment");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Update comment
  const handleUpdateComment = async () => {
    if (!editingComment || !editCommentContent.trim()) return;

    setSubmitLoading(true);
    setError(null);
    try {
      const updateData: UpdateRoadmapCommentRequest = {
        id: editingComment.id,
        content: editCommentContent.trim(),
      };

      const response = await fetch("/api/roadmap/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updateData, userId: user?.id }),
      });

      if (response.ok) {
        setEditingComment(null);
        setEditCommentContent("");
        await fetchComments();
      } else {
        const data = await response.json();
        console.error("Failed to update comment:", data);
        setError(data.error || "Failed to update comment");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      setError("Failed to update comment");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    setError(null);
    try {
      const response = await fetch("/api/roadmap/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commentId, userId: user.id }),
      });

      if (response.ok) {
        // Remove comment from state immediately
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        onCommentCountChange?.(comments.length - 1);
        // Also fetch to ensure consistency
        await fetchComments();
      } else {
        const data = await response.json();
        console.error("Failed to delete comment:", data);
        setError(data.error || "Failed to delete comment");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      setError("Failed to delete comment");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openEditDialog = (comment: RoadmapComment) => {
    setEditingComment(comment);
    setEditCommentContent(comment.content);
  };

  const toggleComments = () => {
    setCommentsVisible(!commentsVisible);
    setError(null);
  };

  return (
    <Box>
      {/* Comments Toggle Button */}
      <Button
        startIcon={<CommentIcon />}
        onClick={toggleComments}
        size="small"
        sx={{ color: "text.secondary" }}
      >
        {comments.length || commentCount}{" "}
        {(comments.length || commentCount) === 1 ? "Comment" : "Comments"}
      </Button>

      {/* Comments Section */}
      {commentsVisible && (
        <Box
          sx={{ mt: 2, pl: 2, borderLeft: "2px solid", borderColor: "divider" }}
        >
          {/* Error Display */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Add Comment Form */}
          {user ? (
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                size="small"
                sx={{ mb: 1 }}
              />
              <Button
                startIcon={<SendIcon />}
                onClick={handleCreateComment}
                disabled={!newComment.trim() || submitLoading}
                size="small"
                variant="contained"
              >
                {submitLoading ? "Posting..." : "Comment"}
              </Button>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Please log in to comment on posts.
            </Alert>
          )}

          {/* Comments List */}
          {loading ? (
            <Typography variant="body2" color="textSecondary">
              Loading comments...
            </Typography>
          ) : comments.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No comments yet. Be the first to comment!
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {comments.map((comment) => (
                <Card
                  key={comment.id}
                  variant="outlined"
                  sx={{ backgroundColor: "background.paper" }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
                    >
                      <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                        {comment.profiles?.username?.[0]?.toUpperCase() || "?"}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight="medium">
                            {comment.profiles?.username || "Unknown"}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formatDate(comment.created_at)}
                          </Typography>
                          {comment.updated_at !== comment.created_at && (
                            <Typography variant="caption" color="textSecondary">
                              (edited)
                            </Typography>
                          )}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          {comment.content}
                        </Typography>
                      </Box>
                      {user && user.id === comment.user_id && (
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(comment)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Edit Comment Dialog */}
      <Dialog
        open={!!editingComment}
        onClose={() => setEditingComment(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Comment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={editCommentContent}
            onChange={(e) => setEditCommentContent(e.target.value)}
            placeholder="Enter your comment..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingComment(null)}>Cancel</Button>
          <Button
            onClick={handleUpdateComment}
            disabled={!editCommentContent.trim() || submitLoading}
            variant="contained"
          >
            {submitLoading ? "Updating..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
