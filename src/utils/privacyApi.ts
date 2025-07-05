import { supabase } from "./supaBase";
import {
  getUserVariablePreference,
  updateUserVariablePreference,
} from "./variableUtils";

export async function fetchVariableSharingSettings(userId: string) {
  // Get user variable preferences which include sharing settings
  const { data, error } = await supabase
    .from("user_variable_preferences")
    .select(
      `
      *,
      variable:variables!user_variable_preferences_variable_id_fkey (
        id,
        name,
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
    return { data: [], error };
  }

  // Transform to match the expected format
  const transformedData =
    data?.map((pref) => ({
      variable_name: pref.variable.name,
      is_shared: pref.is_shared,
      variable_type: pref.variable.data_type,
      category: pref.variable.category,
      variable_id: pref.variable.id,
      label: pref.variable.label,
      icon: pref.variable.icon,
    })) || [];

  return { data: transformedData, error: null };
}

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
  // First, get the variable ID from the variable name
  const { data: variable, error: varError } = await supabase
    .from("variables")
    .select("id")
    .eq("name", variableName)
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
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { data, error };
}

// Legacy support - fetch from old table if needed
export async function fetchLegacyVariableSharingSettings(userId: string) {
  return supabase
    .from("app_variable_sharing_settings")
    .select("*")
    .eq("user_id", userId);
}
