import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supaBase";
import { useUser } from "@/pages/_app";
import Link from "next/link";
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Box,
  CircularProgress,
  IconButton,
  Collapse,
  Button,
  Avatar,
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

  useEffect(() => {
    if (!username) return;
    const fetchProfile = async () => {
      setLoading(true);
      
      try {
        // Step 1: Get basic profile data first
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, name, avatar_url")
          .eq("username", username)
          .single();

        if (profileError || !profileData) {
          console.error("Profile not found:", profileError);
          setProfile(null);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Step 2: Run all other queries in parallel for better performance
        const [
          userVariablesResult,
          followerCountResult,
          followStatusResult
        ] = await Promise.allSettled([
          // Fetch shared variables using the proper RPC function
          supabase.rpc("get_user_shared_variables", { 
            target_user_id: profileData.id 
          }),
          
          // Fetch follower count (with timeout to handle missing table)
          Promise.race([
            supabase
              .from("user_follows")
              .select("*", { count: "exact", head: true })
              .eq("following_id", profileData.id),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 2000)
            )
          ]),
          
          // Check follow status (only if user is logged in and not viewing own profile)
          user && user.id !== profileData.id 
            ? Promise.race([
                supabase
                  .from("user_follows")
                  .select("*")
                  .eq("follower_id", user.id)
                  .eq("following_id", profileData.id)
                  .single(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), 2000)
                )
              ])
            : Promise.resolve({ data: null, error: null })
        ]);

        // Handle user variables result
        if (userVariablesResult.status === 'fulfilled') {
          const result = userVariablesResult.value;
          if (result.error) {
            console.warn("Failed to fetch user variables:", result.error);
            setVariables([]);
          } else {
            setVariables(result.data || []);
          }
        } else {
          console.warn("Failed to fetch user variables:", 
            userVariablesResult.reason
          );
          setVariables([]);
        }

        // Handle follower count result
        if (followerCountResult.status === 'fulfilled' && !(followerCountResult.value as any).error) {
          setFollowerCount((followerCountResult.value as any).count || 0);
        } else {
          console.warn("Failed to fetch follower count (table might not exist):", 
            followerCountResult.status === 'fulfilled' 
              ? (followerCountResult.value as any).error 
              : followerCountResult.reason
          );
          setFollowerCount(0);
        }

        // Handle follow status result
        if (user && user.id !== profileData.id) {
          if (followStatusResult.status === 'fulfilled' && !(followStatusResult.value as any).error) {
            setIsFollowing(!!(followStatusResult.value as any).data);
          } else {
            console.warn("Failed to fetch follow status (table might not exist):", 
              followStatusResult.status === 'fulfilled' 
                ? (followStatusResult.value as any).error 
                : followStatusResult.reason
            );
            setIsFollowing(false);
          }
        }

      } catch (error) {
        console.error("Unexpected error fetching profile:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
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
      // Add timeout protection for follow operations
      const followOperation = async () => {
        if (!isFollowing) {
                  const { error } = await supabase
          .from("user_follows")
          .insert({ follower_id: user.id, following_id: profile.id });
          
          if (!error) {
            setIsFollowing(true);
            setFollowerCount((prev) => prev + 1);
            return true;
          } else {
            console.error("Follow error:", error);
            return false;
          }
        } else {
                  const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.id);
          
          if (!error) {
            setIsFollowing(false);
            setFollowerCount((prev) => Math.max(0, prev - 1));
            return true;
          } else {
            console.error("Unfollow error:", error);
            return false;
          }
        }
      };

      // Race against timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Follow operation timeout')), 3000)
      );

      await Promise.race([followOperation(), timeoutPromise]);

    } catch (error) {
      console.error("Follow/unfollow operation failed:", error);
      
      // Show user-friendly message
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.warn("Follow feature not yet available - database table missing");
      }
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
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar 
            src={getProfilePictureUrl(profile.avatar_url) || undefined}
            sx={{ width: 80, height: 80 }}
          >
            {profile.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4">{profile.username}</Typography>
            {profile.name && (
              <Typography variant="h6" color="textSecondary">
                {profile.name}
              </Typography>
            )}
          </Box>
        </Box>
        
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
          Variables ({variables.length})
        </Typography>

        <List>
          {variables.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No variables tracked"
                secondary="This user hasn't tracked any variables yet."
              />
            </ListItem>
          ) : (
            variables.map((v, i) => (
              <Box key={i}>
                <ListItem
                  sx={{
                    borderBottom: i < variables.length - 1 ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  <ListItemButton onClick={() => handleToggle(v.variable_name)}>
                    <ListItemText
                      primary={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Link 
                            href={`/variable/${encodeURIComponent(v.variable_slug || v.variable_name || v.variable_label)}`} 
                            passHref
                            style={{ textDecoration: 'none' }}
                          >
                            <Typography 
                              variant="subtitle1" 
                              sx={{ 
                                cursor: 'pointer',
                                color: 'primary.main',
                                textDecoration: 'underline',
                                fontWeight: 500,
                                '&:hover': {
                                  color: 'primary.dark',
                                  textDecoration: 'underline',
                                }
                              }}
                              title={`View ${v.variable_name} variable page`}
                            >
                              {v.variable_name}
                            </Typography>
                          </Link>
                          <Typography variant="caption" color="textSecondary">
                            ({v.data_point_count} data points)
                          </Typography>
                          {v.is_shared ? (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                bgcolor: 'success.light', 
                                color: 'success.contrastText',
                                px: 1, 
                                py: 0.25, 
                                borderRadius: 1,
                                fontSize: '0.7rem'
                              }}
                            >
                              SHARED
                            </Typography>
                          ) : (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                bgcolor: 'grey.300', 
                                color: 'grey.700',
                                px: 1, 
                                py: 0.25, 
                                borderRadius: 1,
                                fontSize: '0.7rem'
                              }}
                            >
                              PRIVATE
                            </Typography>
                          )}
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
                  </ListItemButton>
                </ListItem>
                <Collapse in={expanded[v.variable_name]}>
                  <Box sx={{ bgcolor: "grey.50", p: 2 }}>
                    {!v.is_shared ? (
                      <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                        This variable is private and data cannot be viewed.
                      </Typography>
                    ) : logsLoading[v.variable_name] ? (
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
