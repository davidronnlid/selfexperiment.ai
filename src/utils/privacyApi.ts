import { supabase } from "./supaBase";

export async function fetchUserVariablePreferences(userId: string) {
  try {
    // Get user variable preferences which include sharing settings
    const { data, error } = await supabase
      .from("user_variable_preferences")
      .select(
        `
      *,
      variable:variables!user_variable_preferences_variable_id_fkey (
        id,
          slug,
        label,
        data_type,
        category,
        icon
      )
    `
      )
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user variable preferences:", error);
      // If table doesn't exist, return empty array instead of failing
      if (
        error.code === "PGRST116" ||
        error.message.includes("relation") ||
        error.message.includes("does not exist")
      ) {
        console.warn(
          "user_variable_preferences table doesn't exist, returning empty preferences"
        );
        return { data: [], error: null };
      }
      return { data: [], error };
    }

    // Transform to match the expected format
    const transformedData =
      data?.map((pref) => ({
        variable_name: pref.variable.label,
        is_shared: pref.is_shared,
        variable_type: pref.variable.data_type,
        category: pref.variable.category,
        variable_id: pref.variable.id,
        label: pref.variable.label,
        icon: pref.variable.icon,
        preferred_unit: pref.preferred_unit,
        display_name: pref.display_name,
        is_favorite: pref.is_favorite,
      })) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    console.error("Exception fetching user variable preferences:", error);
    return { data: [], error: null };
  }
}

export async function upsertUserVariablePreference({
  userId,
  variableName,
  isShared,
  variableType,
  category,
  preferredUnit,
  displayName,
  isFavorite,
}: {
  userId: string;
  variableName: string;
  isShared: boolean;
  variableType: string;
  category?: string;
  preferredUnit?: string;
  displayName?: string;
  isFavorite?: boolean;
}) {
  try {
    // First, get the variable ID from the variable name
    const { data: variable, error: varError } = await supabase
      .from("variables")
      .select("id")
      .eq("label", variableName)
      .single();

    if (varError) {
      console.error("Error finding variable:", varError);
      return { data: null, error: varError };
    }

    // Update or create user variable preference
    const { data, error } = await supabase
      .from("user_variable_preferences")
      .upsert({
        user_id: userId,
        variable_id: variable.id,
        is_shared: isShared,
        preferred_unit: preferredUnit,
        display_name: displayName,
        is_favorite: isFavorite,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting user variable preference:", error);
      // If table doesn't exist, return null gracefully
      if (
        error.code === "PGRST116" ||
        error.message.includes("relation") ||
        error.message.includes("does not exist")
      ) {
        console.warn(
          "user_variable_preferences table doesn't exist, cannot save preferences"
        );
        return { data: null, error: null };
      }
    }

    return { data, error };
  } catch (error) {
    console.error("Exception upserting user variable preference:", error);
    return { data: null, error: null };
  }
}

/**
 * Fetch variable sharing settings for a user
 */
export async function fetchVariableSharingSettings(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_variable_preferences")
      .select(
        `
        *,
        variable:variables!user_variable_preferences_variable_id_fkey (
          id,
          slug,
          label,
          data_type,
          category,
          icon
        )
      `
      )
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching variable sharing settings:", error);
      // If table doesn't exist, return empty array instead of failing
      if (
        error.code === "PGRST116" ||
        error.message.includes("relation") ||
        error.message.includes("does not exist")
      ) {
        console.warn(
          "user_variable_preferences table doesn't exist, returning empty sharing settings"
        );
        return [];
      }
      throw error;
    }

    // Transform to match expected format
    const transformedData =
      data?.map((pref) => ({
        variable: pref.variable.label,
        is_shared: pref.is_shared,
        variable_type: pref.variable.data_type,
        category: pref.variable.category,
        variable_id: pref.variable.id,
        label: pref.variable.label,
        icon: pref.variable.icon,
        preferred_unit: pref.preferred_unit,
        display_name: pref.display_name,
        is_favorite: pref.is_favorite,
      })) || [];

    return transformedData;
  } catch (error) {
    console.error("Failed to fetch variable sharing settings:", error);
    return [];
  }
}

/**
 * Upsert variable sharing setting
 */
export async function upsertVariableSharingSetting({
  userId,
  variableName,
  isShared,
  variableType,
  category,
}: {
  userId: string;
  variableName: string;
  isShared: boolean;
  variableType: string;
  category?: string;
}) {
  try {
    // First, get the variable ID from the variable name
    const { data: variable, error: varError } = await supabase
      .from("variables")
      .select("id")
      .eq("label", variableName)
      .single();

    if (varError) {
      console.error("Error finding variable:", varError);
      return null;
    }

    const { data, error } = await supabase
      .from("user_variable_preferences")
      .upsert({
        user_id: userId,
        variable_id: variable.id,
        is_shared: isShared,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting variable sharing setting:", error);
      // If table doesn't exist, return null gracefully
      if (
        error.code === "PGRST116" ||
        error.message.includes("relation") ||
        error.message.includes("does not exist")
      ) {
        console.warn(
          "user_variable_preferences table doesn't exist, cannot save sharing settings"
        );
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Failed to upsert variable sharing setting:", error);
    return null;
  }
}
