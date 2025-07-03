import { useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "./_app";
import { supabase } from "@/utils/supaBase";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

export default function CompleteProfilePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Check username uniqueness
  const checkUsername = async (val: string) => {
    setChecking(true);
    setUsername(val);
    if (!val) {
      setUsernameAvailable(true);
      setChecking(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", val)
      .single();
    setUsernameAvailable(!data);
    setChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !dob || !username) {
      setError("All fields are required.");
      return;
    }
    if (!usernameAvailable) {
      setError("Username is already taken.");
      return;
    }
    setSaving(true);
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user?.id,
      username,
      name,
      date_of_birth: dob,
    });
    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
    } else {
      router.push("/analytics");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        You must be logged in.
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Paper elevation={4} className="p-10 rounded-2xl shadow-lg min-w-[340px]">
        <Typography variant="h4" className="mb-4 font-bold">
          Complete Your Profile
        </Typography>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            label="Date of Birth"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
          />
          <TextField
            label="Username"
            value={username}
            onChange={(e) => checkUsername(e.target.value)}
            required
            helperText={
              checking
                ? "Checking..."
                : username && !usernameAvailable
                ? "Username is taken"
                : username
                ? "Username is available"
                : ""
            }
            error={!!username && !usernameAvailable}
          />
          {error && <Typography color="error">{error}</Typography>}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={saving || checking || !usernameAvailable}
          >
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </Paper>
    </div>
  );
}
