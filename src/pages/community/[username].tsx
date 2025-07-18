import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supaBase";
import { useUser } from "@/pages/_app";
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Box,
  CircularProgress,
  IconButton,
  Collapse,
  Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";

export default function CommunityProfilePage() {
  const router = useRouter();
  const { username } = router.query;
  const { user } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [logsByVariable, setLogsByVariable] = useState<Record<string, any[]>>(
    {}
  );
  const [logsLoading, setLogsLoading] = useState<Record<string, boolean>>({});
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [likeStatesByVariable, setLikeStatesByVariable] = useState<
    Record<string, { [logId: string]: { liked: boolean; count: number } }>
  >({});
  const [followerCount, setFollowerCount] = useState<number>(0);

  useEffect(() => {
    if (!username) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", username)
        .single();
      setProfile(profileData);
      if (profileData) {
        // Fetch only shared variables for this user
        const { data: sharedVars, error: sharedError } = await supabase
          .from("variable_sharing_settings")
          .select("variable_name")
          .eq("user_id", profileData.id)
          .eq("is_shared", true);
        setVariables(sharedVars || []);
        // Fetch follower count
        const { count } = await supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("followed_id", profileData.id);
        setFollowerCount(count || 0);
        // Check if current user is following this profile
        if (user && user.id !== profileData.id) {
          const { data: followData } = await supabase
            .from("user_follows")
            .select("*")
            .eq("follower_id", user.id)
            .eq("followed_id", profileData.id)
            .single();
          setIsFollowing(!!followData);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [username, user]);

  const handleToggle = async (variable: string) => {
    setExpanded((prev) => ({ ...prev, [variable]: !prev[variable] }));
    if (!expanded[variable] && profile) {
      setLogsLoading((prev) => ({ ...prev, [variable]: true }));
      // Debug: log the variable name
      console.log("Fetching logs for variable:", variable);
      // Fetch logs for this variable for this user
      const { data: logs, error } = await supabase
        .from("data_points")
        .select("data_point_id, user_id, date, value, notes")
        .eq("user_id", profile.id)
        .ilike("label", variable)
        .order("date", { ascending: false })
        .limit(20); // Reduced from 50 to 20 for faster loading
      console.log("Fetched logs:", logs, error);
      // Fetch likes for these logs
      const logIds = (logs || [])
        .map((log: any) => log.data_point_id)
        .filter(Boolean);
      let allLikes: any[] = [];
      if (logIds.length > 0) {
        const { data: likesData } = await supabase
          .from("data_point_likes")
          .select("data_point_id, user_id")
          .in("data_point_id", logIds);
        allLikes = likesData || [];
      }
      // Build likeStates for this variable
      const likeStates: { [logId: string]: { liked: boolean; count: number } } =
        {};
      for (const log of logs || []) {
        const likesForLog = allLikes.filter(
          (lc) => lc.data_point_id === log.data_point_id
        );
        const liked = !!likesForLog.find(
          (like) => user && like.user_id === user.id
        );
        likeStates[log.data_point_id] = {
          liked,
          count: likesForLog.length,
        };
      }
      setLogsByVariable((prev) => ({ ...prev, [variable]: logs || [] }));
      setLikeStatesByVariable((prev) => ({ ...prev, [variable]: likeStates }));
      setLogsLoading((prev) => ({ ...prev, [variable]: false }));
    }
  };

  const handleLike = async (
    variable: string,
    logId: string,
    likeState: { liked: boolean; count: number }
  ) => {
    if (!user || !logId) return;
    try {
      if (!likeState.liked) {
        const { error } = await supabase
          .from("data_point_likes")
          .upsert(
            { data_point_id: logId, user_id: user.id },
            { onConflict: "data_point_id,user_id" }
          );
        if (error) console.error("Like error:", error);
      } else {
        const { error } = await supabase
          .from("data_point_likes")
          .delete()
          .eq("data_point_id", logId)
          .eq("user_id", user.id);
        if (error) console.error("Unlike error:", error);
      }
      // Refetch likes for this variable
      const logs = logsByVariable[variable] || [];
      const logIds = logs.map((log: any) => log.data_point_id).filter(Boolean);
      let allLikes: any[] = [];
      if (logIds.length > 0) {
        const { data: likesData } = await supabase
          .from("data_point_likes")
          .select("data_point_id, user_id")
          .in("data_point_id", logIds);
        allLikes = likesData || [];
      }
      const likeStates: { [logId: string]: { liked: boolean; count: number } } =
        {};
      for (const log of logs) {
        const likesForLog = allLikes.filter(
          (lc) => lc.data_point_id === log.data_point_id
        );
        const liked = !!likesForLog.find(
          (like) => user && like.user_id === user.id
        );
        likeStates[log.data_point_id] = {
          liked,
          count: likesForLog.length,
        };
      }
      setLikeStatesByVariable((prev) => ({ ...prev, [variable]: likeStates }));
    } catch (err) {
      console.error("handleLike exception:", err);
    }
  };

  const handleFollow = async () => {
    if (!user || !profile) return;
    setFollowLoading(true);
    await supabase.from("user_follows").insert({
      follower_id: user.id,
      followed_id: profile.id,
    });
    setIsFollowing(true);
    setFollowLoading(false);
  };

  const handleUnfollow = async () => {
    if (!user || !profile) return;
    setFollowLoading(true);
    await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followed_id", profile.id);
    setIsFollowing(false);
    setFollowLoading(false);
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h5" align="center" sx={{ mt: 8 }}>
          User not found.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Box sx={{ mb: 2 }}>
        <IconButton onClick={() => window.history.back()} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
      </Box>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h4" align="center" gutterBottom>
            @{profile.username}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="textSecondary">
              {followerCount} follower{followerCount === 1 ? "" : "s"}
            </Typography>
            {user &&
              user.id !== profile.id &&
              (isFollowing ? (
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  onClick={handleUnfollow}
                  disabled={followLoading}
                >
                  Unfollow
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  Follow
                </Button>
              ))}
          </Box>
        </Box>
        <Typography align="center" sx={{ mb: 2 }}>
          Shared Variables
        </Typography>
        <List>
          {variables.length === 0 ? (
            <ListItem>
              <ListItemText primary="No shared variables." />
            </ListItem>
          ) : (
            variables.map((v, i) => (
              <Box key={i}>
                <ListItem
                  secondaryAction={
                    <IconButton onClick={() => handleToggle(v.variable_name)}>
                      {expanded[v.variable_name] ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                  }
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleToggle(v.variable_name)}
                >
                  <ListItemText primary={v.variable_name} />
                </ListItem>
                <Collapse
                  in={expanded[v.variable_name] || false}
                  timeout="auto"
                  unmountOnExit
                >
                  <Box sx={{ pl: 4, pb: 2 }}>
                    {logsLoading[v.variable_name] ? (
                      <CircularProgress size={24} />
                    ) : logsByVariable[v.variable_name]?.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No logs shared for this variable.
                      </Typography>
                    ) : (
                      <List dense>
                        {logsByVariable[v.variable_name]?.map((log, idx) => (
                          <ListItem key={log.data_point_id || idx}>
                            <ListItemText
                              primary={
                                <>
                                  Value: {log.value}
                                  <Box
                                    component="span"
                                    sx={{
                                      ml: 2,
                                      display: "inline-flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <IconButton
                                      color={
                                        likeStatesByVariable[v.variable_name]?.[
                                          log.data_point_id
                                        ]?.liked
                                          ? "error"
                                          : "default"
                                      }
                                      onClick={() =>
                                        handleLike(
                                          v.variable_name,
                                          log.data_point_id,
                                          likeStatesByVariable[
                                            v.variable_name
                                          ]?.[log.data_point_id] || {
                                            liked: false,
                                            count: 0,
                                          }
                                        )
                                      }
                                      size="small"
                                    >
                                      {likeStatesByVariable[v.variable_name]?.[
                                        log.data_point_id
                                      ]?.liked ? (
                                        <FavoriteIcon />
                                      ) : (
                                        <FavoriteBorderIcon />
                                      )}
                                    </IconButton>
                                    <Typography
                                      variant="body2"
                                      sx={{ ml: 0.5 }}
                                    >
                                      {likeStatesByVariable[v.variable_name]?.[
                                        log.data_point_id
                                      ]?.count || 0}
                                    </Typography>
                                  </Box>
                                </>
                              }
                              secondary={`Date: ${new Date(
                                log.date
                              ).toLocaleDateString()}${
                                log.notes ? ` | Notes: ${log.notes}` : ""
                              }`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                </Collapse>
              </Box>
            ))
          )}
        </List>
      </Paper>
    </Container>
  );
}
