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
  Sort as SortIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import {
  RoadmapPost,
  CreateRoadmapPostRequest,
  UpdateRoadmapPostRequest,
  RoadmapLikeInfo,
} from "@/types/roadmap";
import { useUser } from "@/pages/_app";
import RoadmapComments from "./RoadmapComments";

const ROADMAP_TAGS = [
  "Analytics",
  "Log Now",
  "Log Routines",
  "Community",
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "proposed", label: "Proposed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "low", label: "Low Priority" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "popular", label: "Most Popular" },
  { value: "likes", label: "Most Liked" },
  { value: "comments", label: "Most Commented" },
];

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
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<RoadmapPost | null>(null);
  const [likeStates, setLikeStates] = useState<{
    [postId: string]: RoadmapLikeInfo;
  }>({});
  const [commentCounts, setCommentCounts] = useState<{
    [postId: string]: number;
  }>({});
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "likes" | "comments">("recent");

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
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch like info for a specific post
  const fetchLikeInfo = async (postId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/roadmap/likes?postId=${postId}&userId=${user.id}`
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

  const createPost = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/roadmap/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...newPost, userId: user.id }),
      });

      if (response.ok) {
        setNewPost({ title: "", description: "", tag: "Analytics" });
        setCreateDialogOpen(false);
        fetchPosts();
      }
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const updatePost = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/roadmap/posts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...editPost, userId: user.id }),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setEditingPost(null);
        fetchPosts();
      }
    } catch (error) {
      console.error("Error updating post:", error);
    }
  };

  const toggleLike = async (postId: string, shouldLike: boolean) => {
    if (!user) return;

    try {
      const url = shouldLike
        ? `/api/roadmap/likes?postId=${postId}&userId=${user.id}`
        : "/api/roadmap/likes";

      const method = shouldLike ? "POST" : "DELETE";
      const body = shouldLike
        ? undefined
        : JSON.stringify({ postId, userId: user.id });

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body,
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

  const handleToggleLike = (postId: string) => {
    const currentState = likeStates[postId];
    if (!currentState) return;

    const shouldLike = !currentState.userHasLiked;
    toggleLike(postId, shouldLike);
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

  // Handle comment count changes
  const handleCommentCountChange = (postId: string, count: number) => {
    setCommentCounts((prev) => ({
      ...prev,
      [postId]: count,
    }));
  };

  // Sort posts based on selected criteria
  const sortPosts = (postsToSort: RoadmapPost[]) => {
    return [...postsToSort].sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "popular":
          const aPopularity = (likeStates[a.id]?.count || 0) + (commentCounts[a.id] || 0);
          const bPopularity = (likeStates[b.id]?.count || 0) + (commentCounts[b.id] || 0);
          return bPopularity - aPopularity;
        case "likes":
          return (likeStates[b.id]?.count || 0) - (likeStates[a.id]?.count || 0);
        case "comments":
          return (commentCounts[b.id] || 0) - (commentCounts[a.id] || 0);
        default:
          return 0;
      }
    });
  };

  // Filter and sort posts
  useEffect(() => {
    let filtered = posts;
    
    // Filter by tag
    if (selectedTag !== "all") {
      filtered = filtered.filter((post) => post.tag === selectedTag);
    }
    
    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((post) => post.status === selectedStatus);
    }
    
    // Filter by priority
    if (selectedPriority !== "all") {
      filtered = filtered.filter((post) => post.priority === selectedPriority);
    }
    
    const sorted = sortPosts(filtered);
    setFilteredPosts(sorted);
  }, [posts, selectedTag, selectedStatus, selectedPriority, sortBy, likeStates, commentCounts]);

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

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography>Loading roadmap...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Public Roadmap 🚀
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          Suggest features, vote on ideas, and collaborate on the future of the
          app.
          {isAdmin && (
            <>
              {" "}
              <Chip
                icon={<AdminIcon />}
                label="As admin, you can manage status and priority."
                color="primary"
                size="small"
                sx={{ ml: 1 }}
              />
            </>
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          disabled={!user}
          sx={{ bgcolor: "#fdd835", color: "black", "&:hover": { bgcolor: "#f9a825" } }}
        >
          Add Feature Request
        </Button>
      </Box>

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

      {/* Filters and Sort Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h6" component="h2">
          {filteredPosts.length} {filteredPosts.length === 1 ? 'Post' : 'Posts'}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              label="Status"
              onChange={(e) => setSelectedStatus(e.target.value)}
              startAdornment={<FilterIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Priority Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={selectedPriority}
              label="Priority"
              onChange={(e) => setSelectedPriority(e.target.value)}
              startAdornment={<FilterIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sort */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sortBy}
              label="Sort by"
              onChange={(e) => setSortBy(e.target.value as any)}
              startAdornment={<SortIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

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
                  position: "relative",
                }}
              >
                {/* Status and Priority Badges */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    display: "flex",
                    gap: 0.5,
                  }}
                >
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

                {/* Tag and Title */}
                <CardContent sx={{ flexGrow: 1, pt: 5 }}>
                  <Chip
                    label={post.tag}
                    color="primary"
                    size="small"
                    sx={{ mb: 2 }}
                  />
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

                  {/* Author and Date */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mt: 2,
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
                  sx={{
                    flexDirection: "column",
                    alignItems: "stretch",
                    px: 2,
                    pb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
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
                  </Box>

                  {/* Comments Section */}
                  <RoadmapComments
                    postId={post.id}
                    commentCount={
                      commentCounts[post.id] || post.comment_count || 0
                    }
                    onCommentCountChange={(count) =>
                      handleCommentCountChange(post.id, count)
                    }
                  />
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {filteredPosts.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            {selectedTag === "all" && selectedStatus === "all" && selectedPriority === "all"
              ? "No roadmap posts yet. Be the first to suggest a feature!"
              : "No posts match the selected filters."}
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
              label="Category"
              onChange={(e) =>
                setNewPost((prev) => ({
                  ...prev,
                  tag: e.target.value as any,
                }))
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
            onClick={createPost}
            variant="contained"
            disabled={!newPost.title.trim()}
          >
            Create Post
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
          Edit Post
          {isAdmin && (
            <Chip
              icon={<AdminIcon />}
              label="Admin"
              color="primary"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
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
              label="Category"
              onChange={(e) =>
                setEditPost((prev) => ({
                  ...prev,
                  tag: e.target.value as any,
                }))
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
                  label="Status"
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
                  label="Priority"
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

          {!isAdmin && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Note: Status and priority can only be changed by the admin (
              davidronnlidmh).
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={updatePost}
            variant="contained"
            disabled={!editPost.title?.trim()}
          >
            Update Post
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
