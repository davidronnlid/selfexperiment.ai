import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supaBase";
import { useUser } from "./_app";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Avatar,
  Alert,
  Autocomplete,
} from "@mui/material";

// Common timezone options for the autocomplete
const COMMON_TIMEZONES = [
  "Europe/Stockholm",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "UTC",
];

export default function CompleteProfilePage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    name: "",
    date_of_birth: "",
    avatar_url: "",
    timezone: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user && !userLoading) {
      router.replace("/auth");
      return;
    }
    if (user) {
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("username, name, date_of_birth, avatar_url, timezone")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Error fetching profile:", error);
            // Profile might not exist yet, that's okay
          }

          // Get Google profile picture from OAuth data if available
          const googleProfilePic =
            user.user_metadata?.picture || user.user_metadata?.avatar_url;

          // Auto-detect timezone
          const detectedTimezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;

          if (data) {
            setForm({
              username: data.username || "",
              name: data.name || user.user_metadata?.name || "", // Pre-populate name from Google
              date_of_birth: data.date_of_birth || "",
              avatar_url: data.avatar_url || googleProfilePic || "",
              timezone: data.timezone || detectedTimezone,
            });
          } else {
            // No existing profile, populate with Google data and detected timezone
            setForm({
              username: "",
              name: user.user_metadata?.name || "",
              date_of_birth: "",
              avatar_url: googleProfilePic || "",
              timezone: detectedTimezone,
            });
          }
        } catch (err) {
          console.error("Profile fetch error:", err);
        } finally {
          setLoadingProfile(false);
        }
      };

      fetchProfile();
    }
  }, [user, userLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTimezoneChange = (event: any, newValue: string | null) => {
    setForm({ ...form, timezone: newValue || "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.name) {
      setError("Username and name are required.");
      return;
    }
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        username: form.username,
        name: form.name,
        date_of_birth: form.date_of_birth,
        avatar_url: form.avatar_url,
        timezone: form.timezone,
      })
      .eq("id", user.id);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.replace("/track/manual"), 1000);
    }
  };

  if (userLoading || loadingProfile) {
    return (
      <Container sx={{ py: 8 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" gutterBottom>
        Complete Your Account
      </Typography>

      {/* Show Google profile picture if available */}
      {form.avatar_url && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Avatar
            src={form.avatar_url}
            sx={{
              width: 80,
              height: 80,
              border: "3px solid #FFD700",
              boxShadow: 2,
            }}
          />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Account updated!
        </Alert>
      )}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="Username"
          name="username"
          value={form.username}
          onChange={handleChange}
          required
        />
        <TextField
          label="Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <TextField
          label="Date of Birth"
          name="date_of_birth"
          type="date"
          value={form.date_of_birth}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Profile Picture URL"
          name="avatar_url"
          value={form.avatar_url}
          onChange={handleChange}
          helperText="This will be automatically populated from your Google account"
        />
        <Autocomplete
          options={COMMON_TIMEZONES}
          value={form.timezone}
          onChange={handleTimezoneChange}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="Timezone"
              helperText="Auto-detected, but you can change it if needed"
              required
            />
          )}
        />
        <Button type="submit" variant="contained" color="primary">
          Save
        </Button>
      </Box>
    </Container>
  );
}
