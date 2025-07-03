import { supabase } from "./supaBase";

export interface SharedLog {
  log_id: number;
  variable_name: string;
  value: string;
  date: string;
  log_type: "daily_log" | "oura_data";
  user_id?: string;
  username?: string;
}

export interface UserPrivacyProfile {
  profile_visibility: "public" | "private" | "followers_only";
  allow_follow_requests: boolean;
  show_username_in_shared_data: boolean;
  anonymize_shared_data: boolean;
}

/**
 * Get shared logs for a user, respecting privacy settings
 */
export async function getSharedLogs(
  targetUserId: string,
  viewerUserId?: string
): Promise<SharedLog[]> {
  try {
    // If viewer is the same as target user, show all logs
    if (targetUserId === viewerUserId) {
      const { data: dailyLogs, error: dailyError } = await supabase
        .from("daily_logs")
        .select("id, label, value, date, user_id")
        .eq("user_id", targetUserId);

      if (dailyError) throw dailyError;

      const { data: ouraLogs, error: ouraError } = await supabase
        .from("oura_data")
        .select("id, metric_name, value, timestamp, user_id")
        .eq("user_id", targetUserId);

      if (ouraError) throw ouraError;

      return [
        ...(dailyLogs?.map((log) => ({
          log_id: log.id,
          variable_name: log.label,
          value: log.value,
          date: log.date,
          log_type: "daily_log" as const,
          user_id: log.user_id,
        })) || []),
        ...(ouraLogs?.map((log) => ({
          log_id: log.id,
          variable_name: log.metric_name,
          value: log.value.toString(),
          date: log.timestamp,
          log_type: "oura_data" as const,
          user_id: log.user_id,
        })) || []),
      ];
    }

    // For other viewers, only show shared logs that aren't hidden
    const { data: sharedLogs, error } = await supabase.rpc("get_shared_logs", {
      target_user_id: targetUserId,
      viewer_user_id: viewerUserId,
    });

    if (error) throw error;

    return sharedLogs || [];
  } catch (error) {
    console.error("Error getting shared logs:", error);
    return [];
  }
}

/**
 * Get shared variables for a user
 */
export async function getSharedVariables(userId: string): Promise<string[]> {
  try {
    const { data: sharedVars, error } = await supabase.rpc(
      "get_shared_variables",
      {
        target_user_id: userId,
      }
    );

    if (error) throw error;

    return (
      sharedVars?.map((v: { variable_name: string }) => v.variable_name) || []
    );
  } catch (error) {
    console.error("Error getting shared variables:", error);
    return [];
  }
}

/**
 * Check if a user can view another user's data
 */
export async function canViewUserData(
  targetUserId: string,
  viewerUserId?: string
): Promise<boolean> {
  try {
    // Users can always view their own data
    if (targetUserId === viewerUserId) {
      return true;
    }

    // Get target user's privacy profile
    const { data: profile, error } = await supabase
      .from("user_privacy_profile")
      .select("profile_visibility")
      .eq("user_id", targetUserId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    // If no profile exists, default to private
    if (!profile) {
      return false;
    }

    // Public profiles can be viewed by anyone
    if (profile.profile_visibility === "public") {
      return true;
    }

    // Private profiles can only be viewed by the owner
    if (profile.profile_visibility === "private") {
      return false;
    }

    // Followers-only profiles require checking follow relationship
    if (profile.profile_visibility === "followers_only" && viewerUserId) {
      const { data: follow, error: followError } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", viewerUserId)
        .eq("following_id", targetUserId)
        .single();

      if (followError && followError.code !== "PGRST116") throw followError;

      return !!follow;
    }

    return false;
  } catch (error) {
    console.error("Error checking view permissions:", error);
    return false;
  }
}

/**
 * Get user's privacy profile
 */
export async function getUserPrivacyProfile(
  userId: string
): Promise<UserPrivacyProfile | null> {
  try {
    const { data: profile, error } = await supabase
      .from("user_privacy_profile")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return profile;
  } catch (error) {
    console.error("Error getting user privacy profile:", error);
    return null;
  }
}

/**
 * Update user's privacy profile
 */
export async function updateUserPrivacyProfile(
  userId: string,
  updates: Partial<UserPrivacyProfile>
): Promise<boolean> {
  try {
    const { error } = await supabase.from("user_privacy_profile").upsert({
      user_id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error updating privacy profile:", error);
    return false;
  }
}

/**
 * Check if a specific log is hidden
 */
export async function isLogHidden(
  logId: number,
  logType: "daily_log" | "oura_data",
  userId: string
): Promise<boolean> {
  try {
    const { data: logPrivacy, error } = await supabase
      .from("app_log_privacy_settings")
      .select("is_hidden")
      .eq("log_id", logId)
      .eq("log_type", logType)
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return logPrivacy?.is_hidden || false;
  } catch (error) {
    console.error("Error checking log privacy:", error);
    return false;
  }
}

/**
 * Get users that a user is following
 */
export async function getFollowingUsers(userId: string): Promise<string[]> {
  try {
    const { data: follows, error } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", userId);

    if (error) throw error;

    return follows?.map((f) => f.following_id) || [];
  } catch (error) {
    console.error("Error getting following users:", error);
    return [];
  }
}

/**
 * Get users that are following a user
 */
export async function getFollowers(userId: string): Promise<string[]> {
  try {
    const { data: follows, error } = await supabase
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", userId);

    if (error) throw error;

    return follows?.map((f) => f.follower_id) || [];
  } catch (error) {
    console.error("Error getting followers:", error);
    return [];
  }
}

/**
 * Follow a user
 */
export async function followUser(
  followerId: string,
  followingId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("user_follows").insert({
      follower_id: followerId,
      following_id: followingId,
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error following user:", error);
    return false;
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return false;
  }
}

/**
 * Get aggregated shared data for community insights (anonymized)
 */
export async function getCommunityInsights(variableName: string): Promise<{
  average: number;
  count: number;
  min: number;
  max: number;
} | null> {
  try {
    // This would use the privacy-aware functions to get shared data
    // and aggregate it for community insights
    // Implementation depends on your specific aggregation needs

    return null;
  } catch (error) {
    console.error("Error getting community insights:", error);
    return null;
  }
}
