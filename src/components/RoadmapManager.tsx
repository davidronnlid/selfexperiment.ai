import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Tooltip,
  Avatar,
  Grid,
} from "@mui/material";
import {
  Add as AddIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import {
  RoadmapPost,
  CreateRoadmapPostRequest,
  UpdateRoadmapPostRequest,
  RoadmapLikeInfo,
} from "@/types/roadmap";
import { useUser } from "@/pages/_app";

const ROADMAP_TAGS = [
  "Analytics",
  "Log Now",
  "Log Routines",
  "Community",
] as const;
const STATUS_COLORS: Record<
  string,
  "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
> = {
  proposed: "info",
  in_progress: "warning",
  completed: "success",
  rejected: "error",
};

const PRIORITY_COLORS: Record<
  string,
  "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
> = {
  low: "default",
  medium: "warning",
  high: "error",
};

export default function RoadmapManager() {
  const { user, username } = useUser();
  const [posts, setPosts] = useState<RoadmapPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<RoadmapPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<RoadmapPost | null>(null);
  const [likeStates, setLikeStates] = useState<{
    [postId: string]: RoadmapLikeInfo;
  }>({});

  // Check if current user is admin
  const isAdmin = username === "davidronnlidmh";

  // Form state
  const [newPost, setNewPost] = useState<CreateRoadmapPostRequest>({
    title: "",
    description: "",
    tag: "Analytics",
  });

  const [editPost, setEditPost] = useState<UpdateRoadmapPostRequest>({
    id: "",
    title: "",
    description: "",
    tag: "Analytics",
    status: "proposed",
    priority: "medium",
  });

  // Fetch posts
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/roadmap/posts");
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
        // Initialize like states
        const states: { [postId: string]: RoadmapLikeInfo } = {};
        data.forEach((post: RoadmapPost) => {
          states[post.id] = { count: post.like_count, userHasLiked: false };
        });
        setLikeStates(states);
        // Fetch detailed like info for each post
        data.forEach((post: RoadmapPost) => {
          fetchLikeInfo(post.id);
        });
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch like info for a specific post
  const fetchLikeInfo = async (postId: string) => {
    try {
      const response = await fetch(
        `/api/roadmap/likes?postId=${postId}&userId=${user?.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setLikeStates((prev) => ({
          ...prev,
          [postId]: data,
        }));
      }
    } catch (error) {
      console.error("Error fetching like info:", error);
    }
  };

  // Create new post
  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !user) return;

    try {
      const response = await fetch("/api/roadmap/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPost,
          userId: user.id,
        }),
      });

      if (response.ok) {
        const createdPost = await response.json();
        setPosts((prev) => [createdPost, ...prev]);
        setLikeStates((prev) => ({
          ...prev,
          [createdPost.id]: { count: 0, userHasLiked: false },
        }));
        setCreateDialogOpen(false);
        setNewPost({ title: "", description: "", tag: "Analytics" });
      }
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  // Edit post
  const handleEditPost = async () => {
    if (!editPost.title?.trim() || !user) return;

    try {
      const requestBody: any = {
        ...editPost,
        userId: user.id,
      };

      // Only include status and priority if user is admin
      if (!isAdmin) {
        delete requestBody.status;
        delete requestBody.priority;
      }

      const response = await fetch("/api/roadmap/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
        );
        setEditDialogOpen(false);
        setEditingPost(null);
      } else {
        const errorData = await response.json();
        console.error("Error editing post:", errorData);
        alert(errorData.error || "Failed to edit post");
      }
    } catch (error) {
      console.error("Error editing post:", error);
    }
  };

  // Toggle like
  const handleToggleLike = async (postId: string) => {
    if (!user) return;

    const currentState = likeStates[postId];
    if (!currentState) return;

    try {
      const method = currentState.userHasLiked ? "DELETE" : "POST";
      const url = currentState.userHasLiked
        ? `/api/roadmap/likes?postId=${postId}&userId=${user.id}`
        : "/api/roadmap/likes";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:
          method === "POST"
            ? JSON.stringify({ postId, userId: user.id })
            : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        setLikeStates((prev) => ({
          ...prev,
          [postId]: data,
        }));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  // Open edit dialog
  const openEditDialog = (post: RoadmapPost) => {
    setEditingPost(post);
    setEditPost({
      id: post.id,
      title: post.title,
      description: post.description || "",
      tag: post.tag,
      status: post.status,
      priority: post.priority,
    });
    setEditDialogOpen(true);
  };

  // Filter posts by tag
  useEffect(() => {
    if (selectedTag === "all") {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter((post) => post.tag === selectedTag));
    }
  }, [posts, selectedTag]);

  // Load posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h5" fontWeight="bold">
            Public Roadmap
          </Typography>
          {isAdmin && (
            <Tooltip title="Admin User">
              <AdminIcon color="primary" />
            </Tooltip>
          )}
        </Box>
        {user && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Feature Request
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Suggest features, vote on ideas, and collaborate on the future of the
        app.
        {isAdmin && (
          <Typography
            component="span"
            sx={{ ml: 1, fontWeight: "bold", color: "primary.main" }}
          >
            As admin, you can manage status and priority.
          </Typography>
        )}
      </Typography>

      {/* Tag Filter Tabs */}
      <Tabs
        value={selectedTag}
        onChange={(_, newValue) => setSelectedTag(newValue)}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="All" value="all" />
        {ROADMAP_TAGS.map((tag) => (
          <Tab key={tag} label={tag} value={tag} />
        ))}
      </Tabs>

      {/* Posts Grid */}
      <Grid container spacing={3}>
        {filteredPosts.map((post) => {
          const likeState = likeStates[post.id] || {
            count: 0,
            userHasLiked: false,
          };

          return (
            <Grid item xs={12} md={6} lg={4} key={post.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 2,
                    }}
                  >
                    <Chip label={post.tag} color="primary" size="small" />
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Chip
                        label={post.status}
                        color={STATUS_COLORS[post.status]}
                        size="small"
                      />
                      <Chip
                        label={post.priority}
                        color={PRIORITY_COLORS[post.priority]}
                        size="small"
                      />
                    </Box>
                  </Box>

                  <Typography variant="h6" component="h3" gutterBottom>
                    {post.title}
                  </Typography>

                  {post.description && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mb: 2 }}
                    >
                      {post.description}
                    </Typography>
                  )}

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mt: "auto",
                    }}
                  >
                    <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                      {post.profiles?.username?.[0]?.toUpperCase() || "?"}
                    </Avatar>
                    <Typography variant="caption" color="textSecondary">
                      by {post.profiles?.username || "Unknown"} ·{" "}
                      {formatDate(post.created_at)}
                    </Typography>
                  </Box>

                  {post.last_edited_by !== post.created_by && (
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      Last edited by {post.last_editor?.username || "Unknown"} ·{" "}
                      {formatDate(post.updated_at)}
                    </Typography>
                  )}
                </CardContent>

                <CardActions
                  sx={{ justifyContent: "space-between", px: 2, pb: 2 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleLike(post.id)}
                      color={likeState.userHasLiked ? "error" : "default"}
                      disabled={!user}
                    >
                      {likeState.userHasLiked ? (
                        <FavoriteIcon />
                      ) : (
                        <FavoriteBorderIcon />
                      )}
                    </IconButton>
                    <Typography variant="body2" sx={{ ml: 0.5 }}>
                      {likeState.count}
                    </Typography>
                  </Box>

                  {user && (
                    <Tooltip title="Edit Post">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(post)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {filteredPosts.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            {selectedTag === "all"
              ? "No roadmap posts yet. Be the first to suggest a feature!"
              : `No posts in the ${selectedTag} category yet.`}
          </Typography>
        </Box>
      )}

      {/* Create Post Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Suggest a Feature</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            value={newPost.title}
            onChange={(e) =>
              setNewPost((prev) => ({ ...prev, title: e.target.value }))
            }
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            value={newPost.description}
            onChange={(e) =>
              setNewPost((prev) => ({ ...prev, description: e.target.value }))
            }
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={newPost.tag}
              onChange={(e) =>
                setNewPost((prev) => ({ ...prev, tag: e.target.value as any }))
              }
            >
              {ROADMAP_TAGS.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreatePost}
            variant="contained"
            disabled={!newPost.title.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            Edit Feature Request
            {isAdmin && (
              <Chip
                icon={<AdminIcon />}
                label="Admin"
                color="primary"
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            value={editPost.title}
            onChange={(e) =>
              setEditPost((prev) => ({ ...prev, title: e.target.value }))
            }
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={editPost.description}
            onChange={(e) =>
              setEditPost((prev) => ({ ...prev, description: e.target.value }))
            }
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={editPost.tag}
              onChange={(e) =>
                setEditPost((prev) => ({ ...prev, tag: e.target.value as any }))
              }
            >
              {ROADMAP_TAGS.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Admin-only fields */}
          {isAdmin && (
            <>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editPost.status}
                  onChange={(e) =>
                    setEditPost((prev) => ({
                      ...prev,
                      status: e.target.value as any,
                    }))
                  }
                >
                  <MenuItem value="proposed">Proposed</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={editPost.priority}
                  onChange={(e) =>
                    setEditPost((prev) => ({
                      ...prev,
                      priority: e.target.value as any,
                    }))
                  }
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </>
          )}

          {/* Non-admin notice */}
          {!isAdmin && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Status and priority can only be changed by the admin.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEditPost}
            variant="contained"
            disabled={!editPost.title?.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
