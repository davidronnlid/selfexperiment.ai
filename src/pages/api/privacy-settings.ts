import { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";

function getCookiesFromReq(req: NextApiRequest) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getCookiesFromReq(req);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly`);
          });
        },
      },
    }
  );
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
        return await handleGet(req, res, user.id, supabase);
      case "POST":
        return await handlePost(req, res, user.id, supabase);
      case "PUT":
        return await handlePut(req, res, user.id, supabase);
      case "DELETE":
        return await handleDelete(req, res, user.id, supabase);
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
  userId: string,
  supabase: any
) {
  const { type } = req.query;

  try {
    switch (type) {
      case "variable-settings":
        const { data: varSettings, error: varError } = await supabase
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

        if (varError) throw varError;

        // Transform to match expected format
        const transformedSettings =
          varSettings?.map((pref: any) => ({
            variable_name: pref.variable.name,
            is_shared: pref.is_shared,
            variable_type: pref.variable.data_type,
            category: pref.variable.category,
            variable_id: pref.variable.id,
            label: pref.variable.label,
            icon: pref.variable.icon,
          })) || [];

        return res.status(200).json({ data: transformedSettings });

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
  userId: string,
  supabase: any
) {
  const { type } = req.query;
  const body = req.body;

  try {
    switch (type) {
      case "variable-settings":
        // First, get the variable ID from the variable name
        const { data: variable, error: findVarError } = await supabase
          .from("variables")
          .select("id")
          .eq("label", body.variable_name)
          .single();

        if (findVarError) throw findVarError;

        const { data: varData, error: varError } = await supabase
          .from("user_variable_preferences")
          .upsert({
            user_id: userId,
            variable_id: variable.id,
            is_shared: body.is_shared,
            updated_at: new Date().toISOString(),
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
  userId: string,
  supabase: any
) {
  const { type, id } = req.query;
  const body = req.body;

  try {
    switch (type) {
      case "variable-settings":
        const { data: varData, error: varError } = await supabase
          .from("user_variable_preferences")
          .update({
            is_shared: body.is_shared,
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
  userId: string,
  supabase: any
) {
  const { type, id } = req.query;

  try {
    switch (type) {
      case "variable-settings":
        const { error: varError } = await supabase
          .from("user_variable_preferences")
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
