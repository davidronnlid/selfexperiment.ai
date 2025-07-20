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
        // Fetch shared variables and their data using the new function
        const { data: sharedVars, error: sharedError } = await supabase.rpc(
          "get_user_shared_variables",
          { target_user_id: profileData.id }
        );

        if (sharedError) {
          console.error("Error fetching shared variables:", sharedError);
        } else {
          // Transform the data to match the expected format
          const transformedVars = (sharedVars || []).map((v: any) => ({
            variable_id: v.variable_id,
            variable_name: v.variable_label,
            variable_label: v.variable_label,
            variable_slug: v.variable_slug,
            data_point_count: v.data_point_count,
            latest_value: v.latest_value,
            latest_date: v.latest_date,
          }));
          setVariables(transformedVars);
        }
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

      // Find the variable_id for this variable name
      const currentVariable = variables.find(
        (v) => v.variable_name === variable
      );

      if (!currentVariable) {
        console.error("Variable not found:", variable);
        setLogsLoading((prev) => ({ ...prev, [variable]: false }));
        return;
      }

      // Fetch shared data points for this variable using the new function
      const { data: logs, error } = await supabase.rpc(
        "get_shared_data_points",
        {
          target_user_id: profile.id,
          target_variable_id: currentVariable.variable_id,
          viewer_user_id: user?.id || null,
          limit_count: 20,
        }
      );

      console.log("Fetched shared logs:", logs, error);

      // Fetch likes for these logs (using the log id instead of data_point_id)
      const logIds = (logs || []).map((log: any) => log.id).filter(Boolean);
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
          (lc) => lc.data_point_id === log.id
        );
        const liked = !!likesForLog.find(
          (like) => user && like.user_id === user.id
        );
        likeStates[log.id] = {
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
      const logIds = logs.map((log: any) => log.id).filter(Boolean);
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
          (lc) => lc.data_point_id === log.id
        );
        const liked = !!likesForLog.find(
          (like) => user && like.user_id === user.id
        );
        likeStates[log.id] = {
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
    try {
      if (!isFollowing) {
        const { error } = await supabase
          .from("user_follows")
          .insert({ follower_id: user.id, followed_id: profile.id });
        if (!error) {
          setIsFollowing(true);
          setFollowerCount((prev) => prev + 1);
        }
      } else {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("followed_id", profile.id);
        if (!error) {
          setIsFollowing(false);
          setFollowerCount((prev) => prev - 1);
        }
      }
    } catch (error) {
      console.error("Follow/unfollow error:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading profile...</Typography>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h5">User not found</Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/community")}
          sx={{ mt: 2 }}
        >
          Back to Community
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/community")}
          sx={{ mb: 2 }}
        >
          Back to Community
        </Button>
        <Typography variant="h4">{profile.username}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
          <Typography variant="body2" color="textSecondary">
            {followerCount} followers
          </Typography>
          {user && user.id !== profile.id && (
            <Button
              variant={isFollowing ? "outlined" : "contained"}
              size="small"
              onClick={handleFollow}
              disabled={followLoading}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </Button>
          )}
        </Box>
      </Box>

      <Paper>
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
          Shared Variables ({variables.length})
        </Typography>

        <List>
          {variables.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No shared variables"
                secondary="This user hasn't shared any variables yet."
              />
            </ListItem>
          ) : (
            variables.map((v, i) => (
              <Box key={i}>
                <ListItem
                  button
                  onClick={() => handleToggle(v.variable_name)}
                  sx={{
                    borderBottom: i < variables.length - 1 ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="subtitle1">
                          {v.variable_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          ({v.data_point_count} data points)
                        </Typography>
                      </Box>
                    }
                    secondary={
                      v.latest_value && v.latest_date
                        ? `Latest: ${v.latest_value} on ${new Date(
                            v.latest_date
                          ).toLocaleDateString()}`
                        : "No recent data"
                    }
                  />
                  <IconButton size="small">
                    {expanded[v.variable_name] ? (
                      <ExpandLessIcon />
                    ) : (
                      <ExpandMoreIcon />
                    )}
                  </IconButton>
                </ListItem>
                <Collapse in={expanded[v.variable_name]}>
                  <Box sx={{ bgcolor: "grey.50", p: 2 }}>
                    {logsLoading[v.variable_name] ? (
                      <CircularProgress size={20} />
                    ) : (
                      <List dense>
                        {logsByVariable[v.variable_name]?.map((log, idx) => (
                          <ListItem
                            key={idx}
                            sx={{
                              bgcolor: "white",
                              mb: 1,
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "grey.200",
                            }}
                          >
                            <ListItemText
                              primary={
                                <>
                                  <Typography
                                    component="span"
                                    variant="body1"
                                    fontWeight="bold"
                                  >
                                    Value: {log.value}
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      mt: 0.5,
                                    }}
                                  >
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleLike(
                                          v.variable_name,
                                          log.id,
                                          likeStatesByVariable[
                                            v.variable_name
                                          ]?.[log.id] || {
                                            liked: false,
                                            count: 0,
                                          }
                                        )
                                      }
                                      disabled={!user}
                                    >
                                      {likeStatesByVariable[v.variable_name]?.[
                                        log.id
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
                                        log.id
                                      ]?.count || 0}
                                    </Typography>
                                  </Box>
                                </>
                              }
                              secondary={`Date: ${new Date(
                                log.date
                              ).toLocaleDateString()}${
                                log.notes ? ` | Notes: ${log.notes}` : ""
                              } | Source: ${log.source || "manual"}`}
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
