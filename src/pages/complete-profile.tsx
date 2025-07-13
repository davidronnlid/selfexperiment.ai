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
} from "@mui/material";

export default function CompleteProfilePage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    name: "",
    date_of_birth: "",
    avatar_url: "",
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
            .select("username, name, date_of_birth, avatar_url")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Error fetching profile:", error);
            // Profile might not exist yet, that's okay
          }

          if (data) {
            setForm({
              username: data.username || "",
              name: data.name || "",
              date_of_birth: data.date_of_birth || "",
              avatar_url: data.avatar_url || "",
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
      })
      .eq("id", user.id);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.replace("/log/now"), 1000);
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
        Complete Your Profile
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Profile updated!
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
          label="Avatar URL"
          name="avatar_url"
          value={form.avatar_url}
          onChange={handleChange}
        />
        {form.avatar_url && (
          <Avatar src={form.avatar_url} sx={{ width: 56, height: 56, mb: 1 }} />
        )}
        <Button type="submit" variant="contained" color="primary">
          Save
        </Button>
      </Box>
    </Container>
  );
}
