import { useState, useEffect } from "react";
import { supabase } from "@/utils/supaBase";
import {
  Container,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Paper,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CardActions,
} from "@mui/material";
import Link from "next/link";
import { useUser } from "@/pages/_app";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import RoadmapManager from "@/components/RoadmapManager";

function formatFriendlyDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 1 && now.getDate() === date.getDate()) return "Today";
  if (diff < 2 && now.getDate() - date.getDate() === 1) return "Yesterday";
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

const variableEmojis: Record<string, string> = {
  Mood: "😃",
  Anxiety: "😰",
  Sleep: "😴",
  // Add more mappings as needed
};

export default function CommunityPage() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [likeStates, setLikeStates] = useState<{
    [dataPointId: string]: { liked: boolean; count: number };
  }>({});

  // Helper function to get profile picture URL
  const getProfilePictureUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return null;
    
    // If it's already a full URL (OAuth profile pics), return as is
    if (avatarUrl.startsWith('http')) {
      return avatarUrl;
    }
    
    // Otherwise, it's a Supabase storage path
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(avatarUrl);
    return data.publicUrl;
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (e.target.value.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .ilike("username", `%${e.target.value}%`)
      .limit(10);
    console.log("Search results:", data, error);
    setResults(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const fetchFeed = async () => {
      if (!user) return;
      setFeedLoading(true);

      // Get followed user ids
      const { data: follows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);
      const followedIds = follows?.map((f: any) => f.following_id) || [];
      console.log("followedIds", followedIds); // DEBUG LOG

      if (followedIds.length === 0) {
        console.log("No followed users, feed will be empty"); // DEBUG LOG
        setFeed([]);
        setFeedLoading(false);
        return;
      }

      // Get recent shared data points from followed users using the new function
      try {
        const allSharedLogs: any[] = [];

        // Fetch shared data for each followed user
        for (const userId of followedIds) {
          const { data: userSharedLogs, error } = await supabase.rpc(
            "get_all_shared_data_points",
            {
              target_user_id: userId,
              viewer_user_id: user.id,
              limit_count: 10, // Get 10 recent logs per user
            }
          );

          if (!error && userSharedLogs) {
            // Add username to each log
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", userId)
              .single();

            const logsWithUsername = userSharedLogs.map((log: any) => ({
              ...log,
              username: profile?.username || "Unknown User",
            }));

            allSharedLogs.push(...logsWithUsername);
          }
        }

        // Sort all logs by creation date (newest first) and limit to 15
        allSharedLogs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const limitedLogs = allSharedLogs.slice(0, 15);

        console.log("Fetched shared logs:", limitedLogs);
        setFeed(limitedLogs);
      } catch (error) {
        console.error("Error fetching shared feed:", error);
        setFeed([]);
      }

      setFeedLoading(false);
    };
    fetchFeed();
  }, [user]);

  // Fetch like counts and user like status for logs in the feed
  useEffect(() => {
    if (!user || feed.length === 0) return;
    const logIds = feed.map((log) => log.id).filter(Boolean);
    if (logIds.length === 0) return;
    const fetchLikes = async () => {
      // 1. Fetch all likes for these logs
      const { data: allLikes } = await supabase
        .from("data_point_likes")
        .select("data_point_id, user_id")
        .in("data_point_id", logIds);
      // 2. Build likeStates
      const likeStatesObj: {
        [dataPointId: string]: { liked: boolean; count: number };
      } = {};
      for (const log of feed) {
        if (!log.id) continue;
        const likesForLog =
          allLikes?.filter(
            (lc: { data_point_id: any; user_id: any }) =>
              lc.data_point_id === log.id
          ) || [];
        const liked = !!likesForLog.find((like) => like.user_id === user.id);
        likeStatesObj[log.id] = {
          liked,
          count: likesForLog.length,
        };
      }
      setLikeStates(likeStatesObj);
    };
    fetchLikes();
  }, [feed, user]);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Community
      </Typography>
      <Typography align="center" sx={{ mb: 3 }}>
        Search for users by username to view their public profile and shared
        variables.
      </Typography>
      <TextField
        label="Search by username"
        value={search}
        onChange={handleSearch}
        fullWidth
        sx={{ mb: 3 }}
        autoFocus
      />
      <Paper>
        <List>
          {results.map((user) => (
            <ListItem key={user.username} disablePadding>
              <ListItemButton
                onClick={() => window.location.href = `/community/${user.username}`}
                sx={{ cursor: 'pointer' }}
              >
                <Avatar 
                  src={getProfilePictureUrl(user.avatar_url) || undefined} 
                  sx={{ mr: 2, width: 40, height: 40 }}
                >
                  {user.username?.[0]?.toUpperCase()}
                </Avatar>
                <ListItemText primary={user.username} />
              </ListItemButton>
            </ListItem>
          ))}
          {!loading && results.length === 0 && search.length > 1 && (
            <ListItem>
              <ListItemText primary="No users found." />
            </ListItem>
          )}
        </List>
      </Paper>

      {/* Roadmap Section */}
      <RoadmapManager />
      {user && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Feed: Recent Logs from Users You Follow
          </Typography>
          {feedLoading ? (
            <Typography>Loading feed...</Typography>
          ) : feed.length === 0 ? (
            <Typography>
              No recent shared logs from users you follow.
            </Typography>
          ) : (
            <Paper sx={{ mt: 2 }}>
              <List>
                {feed.map((log, idx) => {
                  const logId = log.id || idx;
                  const emoji = variableEmojis[log.variable_label] || "📝";
                  const likeState = likeStates[logId] || {
                    liked: false,
                    count: 0,
                  };
                  const handleLike = async () => {
                    console.log("handleLike called", {
                      logId,
                      user,
                      likeState,
                    });
                    if (!user) return;
                    if (!logId) {
                      console.error("No logId for like!");
                      return;
                    }
                    try {
                      if (!likeState.liked) {
                        // Like: upsert
                        const { error } = await supabase
                          .from("data_point_likes")
                          .upsert(
                            { data_point_id: logId, user_id: user.id },
                            { onConflict: "data_point_id,user_id" }
                          );
                        if (error) console.error("Like error:", error);
                      } else {
                        // Unlike: delete
                        const { error } = await supabase
                          .from("data_point_likes")
                          .delete()
                          .eq("data_point_id", logId)
                          .eq("user_id", user.id);
                        if (error) console.error("Unlike error:", error);
                      }
                      // Refetch likes for this log (or all logs)
                      const logIds = feed.map((l) => l.id).filter(Boolean);
                      if (logIds.length === 0) return;
                      const { data: allLikes, error: fetchError } =
                        await supabase
                          .from("data_point_likes")
                          .select("data_point_id, user_id")
                          .in("data_point_id", logIds);
                      if (fetchError)
                        console.error("Fetch likes error:", fetchError);
                      const likeStatesObj: {
                        [dataPointId: string]: {
                          liked: boolean;
                          count: number;
                        };
                      } = {};
                      for (const l of feed) {
                        if (!l.id) continue;
                        const likesForLog =
                          allLikes?.filter(
                            (lc: { data_point_id: any; user_id: any }) =>
                              lc.data_point_id === l.id
                          ) || [];
                        const liked = !!likesForLog.find(
                          (like) => like.user_id === user.id
                        );
                        likeStatesObj[l.id] = {
                          liked,
                          count: likesForLog.length,
                        };
                      }
                      setLikeStates(likeStatesObj);
                    } catch (err) {
                      console.error("handleLike exception:", err);
                    }
                  };
                  return (
                    <Card
                      key={logId}
                      sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}
                    >
                      <CardHeader
                        avatar={
                          <Avatar>
                            {log.username?.[0]?.toUpperCase() || "?"}
                          </Avatar>
                        }
                        title={<b>@{log.username || "Unknown User"}</b>}
                        subheader={formatFriendlyDate(log.date)}
                      />
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={1}>
                          <span style={{ fontSize: 28, marginRight: 8 }}>
                            {emoji}
                          </span>
                          <Typography
                            variant="h6"
                            component="span"
                            fontWeight="bold"
                            sx={{ mr: 1 }}
                          >
                            {log.variable_label}:
                          </Typography>
                          <Typography
                            variant="h6"
                            component="span"
                            color="primary"
                            fontWeight="bold"
                          >
                            {log.value}
                          </Typography>
                        </Box>
                        {log.notes && (
                          <Typography variant="body2" color="text.secondary">
                            {log.notes}
                          </Typography>
                        )}
                        <Box
                          sx={{
                            mt: 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Chip
                            label={log.source || "manual"}
                            size="small"
                            variant="outlined"
                            color={
                              log.source === "oura"
                                ? "primary"
                                : log.source === "withings"
                                ? "secondary"
                                : "default"
                            }
                          />
                        </Box>
                      </CardContent>
                      <CardActions>
                        <IconButton
                          color={likeState.liked ? "error" : "default"}
                          onClick={handleLike}
                          size="small"
                        >
                          {likeState.liked ? (
                            <FavoriteIcon />
                          ) : (
                            <FavoriteBorderIcon />
                          )}
                        </IconButton>
                        <Typography variant="body2" color="text.secondary">
                          {likeState.count}
                        </Typography>
                      </CardActions>
                    </Card>
                  );
                })}
              </List>
            </Paper>
          )}
        </Box>
      )}
    </Container>
  );
}
