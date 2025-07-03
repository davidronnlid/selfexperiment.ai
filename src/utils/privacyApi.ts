import { supabase } from "./supaBase";

export async function fetchVariableSharingSettings(userId: string) {
  return supabase
    .from("app_variable_sharing_settings")
    .select("*")
    .eq("user_id", userId);
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
  return supabase.from("app_variable_sharing_settings").upsert({
    user_id: userId,
    variable_name: variableName,
    is_shared: isShared,
    variable_type: variableType,
    category,
    updated_at: new Date().toISOString(),
  });
}
