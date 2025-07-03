import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (
    req.method !== "GET" &&
    req.method !== "POST" &&
    req.method !== "PUT" &&
    req.method !== "DELETE"
  ) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user from auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { action, type } = req.query;

    switch (req.method) {
      case "GET":
        return await handleGet(req, res, user.id);
      case "POST":
        return await handlePost(req, res, user.id);
      case "PUT":
        return await handlePut(req, res, user.id);
      case "DELETE":
        return await handleDelete(req, res, user.id);
      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Privacy settings API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { type } = req.query;

  try {
    switch (type) {
      case "variable-settings":
        const { data: varSettings, error: varError } = await supabase
          .from("app_variable_sharing_settings")
          .select("*")
          .eq("user_id", userId);

        if (varError) throw varError;
        return res.status(200).json({ data: varSettings });

      case "log-settings":
        const { data: logSettings, error: logError } = await supabase
          .from("app_log_privacy_settings")
          .select("*")
          .eq("user_id", userId);

        if (logError) throw logError;
        return res.status(200).json({ data: logSettings });

      case "profile":
        const { data: profile, error: profileError } = await supabase
          .from("user_privacy_profile")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (profileError && profileError.code !== "PGRST116")
          throw profileError;
        return res.status(200).json({ data: profile });

      default:
        return res.status(400).json({ error: "Invalid type parameter" });
    }
  } catch (error) {
    console.error("Error fetching privacy settings:", error);
    return res.status(500).json({ error: "Failed to fetch privacy settings" });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { type } = req.query;
  const body = req.body;

  try {
    switch (type) {
      case "variable-settings":
        const { data: varData, error: varError } = await supabase
          .from("app_variable_sharing_settings")
          .upsert({
            user_id: userId,
            variable_name: body.variable_name,
            is_shared: body.is_shared,
            variable_type: body.variable_type,
            category: body.category,
          })
          .select()
          .single();

        if (varError) throw varError;
        return res.status(201).json({ data: varData });

      case "log-settings":
        const { data: logData, error: logError } = await supabase
          .from("app_log_privacy_settings")
          .upsert({
            user_id: userId,
            log_id: body.log_id,
            log_type: body.log_type,
            is_hidden: body.is_hidden,
          })
          .select()
          .single();

        if (logError) throw logError;
        return res.status(201).json({ data: logData });

      case "profile":
        const { data: profileData, error: profileError } = await supabase
          .from("user_privacy_profile")
          .upsert({
            user_id: userId,
            profile_visibility: body.profile_visibility || "private",
            allow_follow_requests: body.allow_follow_requests ?? true,
            show_username_in_shared_data:
              body.show_username_in_shared_data ?? false,
            anonymize_shared_data: body.anonymize_shared_data ?? true,
          })
          .select()
          .single();

        if (profileError) throw profileError;
        return res.status(201).json({ data: profileData });

      default:
        return res.status(400).json({ error: "Invalid type parameter" });
    }
  } catch (error) {
    console.error("Error creating privacy settings:", error);
    return res.status(500).json({ error: "Failed to create privacy settings" });
  }
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { type, id } = req.query;
  const body = req.body;

  try {
    switch (type) {
      case "variable-settings":
        const { data: varData, error: varError } = await supabase
          .from("app_variable_sharing_settings")
          .update({
            is_shared: body.is_shared,
            category: body.category,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single();

        if (varError) throw varError;
        return res.status(200).json({ data: varData });

      case "log-settings":
        const { data: logData, error: logError } = await supabase
          .from("app_log_privacy_settings")
          .update({
            is_hidden: body.is_hidden,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single();

        if (logError) throw logError;
        return res.status(200).json({ data: logData });

      case "profile":
        const { data: profileData, error: profileError } = await supabase
          .from("user_privacy_profile")
          .update({
            profile_visibility: body.profile_visibility,
            allow_follow_requests: body.allow_follow_requests,
            show_username_in_shared_data: body.show_username_in_shared_data,
            anonymize_shared_data: body.anonymize_shared_data,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .select()
          .single();

        if (profileError) throw profileError;
        return res.status(200).json({ data: profileData });

      default:
        return res.status(400).json({ error: "Invalid type parameter" });
    }
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return res.status(500).json({ error: "Failed to update privacy settings" });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { type, id } = req.query;

  try {
    switch (type) {
      case "variable-settings":
        const { error: varError } = await supabase
          .from("app_variable_sharing_settings")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);

        if (varError) throw varError;
        return res.status(204).end();

      case "log-settings":
        const { error: logError } = await supabase
          .from("app_log_privacy_settings")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);

        if (logError) throw logError;
        return res.status(204).end();

      default:
        return res.status(400).json({ error: "Invalid type parameter" });
    }
  } catch (error) {
    console.error("Error deleting privacy settings:", error);
    return res.status(500).json({ error: "Failed to delete privacy settings" });
  }
}
