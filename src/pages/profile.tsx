import { useUser } from "./_app";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supaBase";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import AvatarUploader from "@/components/AvatarUploader";
import {
  Container,
  Box,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  FaShieldAlt,
  FaEye,
  FaEyeSlash,
  FaUsers,
  FaLock,
  FaGlobe,
  FaExclamationTriangle,
  FaUserCircle,
} from "react-icons/fa";
import { LOG_LABELS } from "@/utils/logLabels";
import VariableSharingManager from "../components/VariableSharingManager";
import AnalyzePrivacySection from "../components/AnalyzePrivacySection";

interface Profile {
  username: string;
  name: string;
  date_of_birth: string;
  avatar_url?: string | null;
}

function SharedVariablesViewer({ username }: { username: string }) {
  const [sharedVars, setSharedVars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSharedVars() {
      setLoading(true);
      setError("");
      setSharedVars([]);
      // 1. Lookup user by username
      const { data: userProfile, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();
      if (userError || !userProfile) {
        setError("User not found");
        setLoading(false);
        return;
      }
      // 2. Fetch shared variables
      const { data: vars, error: varError } = await supabase
        .from("variable_sharing_settings")
        .select("variable_name, category")
        .eq("user_id", userProfile.id)
        .eq("is_shared", true);
      if (varError) {
        setError("Failed to load shared variables");
        setLoading(false);
        return;
      }
      setSharedVars(vars || []);
      setLoading(false);
    }
    if (username) fetchSharedVars();
  }, [username]);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!sharedVars.length)
    return <Typography>No shared variables for this user.</Typography>;
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Shared Variables
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {sharedVars.map((v) => (
          <Chip key={v.variable_name} label={v.variable_name} />
        ))}
      </Box>
    </Paper>
  );
}

export default function ProfilePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Profile>({
    username: "",
    name: "",
    date_of_birth: "",
    avatar_url: null,
  });
  const [saving, setSaving] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Privacy settings state
  const [variableSettings, setVariableSettings] = useState<any[]>([]);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { username } = router.query;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setProfileLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("profiles")
        .select("username, name, date_of_birth, avatar_url")
        .eq("id", user.id)
        .single();
      if (error) {
        setError("Could not load profile.");
        setProfile(null);
      } else if (!data) {
        // No profile row exists, redirect to complete-profile
        router.push("/complete-profile");
        return;
      } else {
        setProfile(data);
        setForm(data);
      }
      setProfileLoading(false);
    };
    if (user) fetchProfile();
  }, [user, router]);

  // Load privacy settings
  const loadPrivacySettings = async () => {
    try {
      setLoading(true);

      const { data: varSettings, error: varError } = await supabase
        .from("variable_sharing_settings")
        .select("*")
        .eq("user_id", user?.id);

      if (varError) throw varError;

      setVariableSettings(varSettings || []);
    } catch (error) {
      console.error("Error loading privacy settings:", error);
      setError("Failed to load shared variables");
    } finally {
      setLoading(false);
    }
  };

  // Username uniqueness check
  const checkUsername = async (val: string) => {
    setCheckingUsername(true);
    setForm((f) => ({ ...f, username: val }));
    if (!val) {
      setUsernameAvailable(true);
      setCheckingUsername(false);
      return;
    }
    if (val === profile?.username) {
      setUsernameAvailable(true);
      setCheckingUsername(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", val)
      .single();
    setUsernameAvailable(!data);
    setCheckingUsername(false);
  };

  const handleEdit = () => {
    setForm(profile!);
    setEditMode(true);
    setError("");
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm(profile!);
    setError("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "username") checkUsername(value);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.date_of_birth || !form.username) {
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
      ...form,
    });
    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
    } else {
      setProfile(form);
      setEditMode(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (filePath: string) => {
    setSaving(true);
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user?.id,
      avatar_url: filePath,
    });
    setSaving(false);
    if (!upsertError) {
      setProfile((prev) => (prev ? { ...prev, avatar_url: filePath } : prev));
      setForm((prev) => ({ ...prev, avatar_url: filePath }));
    }
  };

  // Privacy functions
  const handleVariableSharingChange = async (
    variableName: string,
    isShared: boolean
  ) => {
    try {
      setPrivacySaving(true);
      const { error } = await supabase
        .from("variable_sharing_settings")
        .upsert({
          user_id: user?.id,
          variable_name: variableName,
          is_shared: isShared,
          variable_type: "predefined",
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      await loadPrivacySettings();
      setPrivacyMessage({
        type: "success",
        text: "Variable sharing setting updated",
      });
    } catch (error) {
      setPrivacyMessage({
        type: "error",
        text: "Failed to update variable sharing setting",
      });
    } finally {
      setPrivacySaving(false);
    }
  };

  const getVariableSharingStatus = (variableName: string) => {
    const setting = variableSettings.find(
      (s) => s.variable_name === variableName
    );
    return setting?.is_shared ?? false;
  };

  const getSharedVariablesCount = () => {
    return variableSettings.filter((s) => s.is_shared).length;
  };

  // Group variables by category
  const groupedVariables = {
    "Mental & Emotional": LOG_LABELS.filter((v) =>
      [
        "Stress",
        "Cognitive Control",
        "Anxiety Before Bed",
        "Mood",
        "Emotional Event",
      ].includes(v.label)
    ),
    "Sleep & Recovery": LOG_LABELS.filter((v) =>
      [
        "Sleep Time",
        "Fell Asleep Time",
        "Sleep Duration",
        "Sleep Quality",
        "Naps",
      ].includes(v.label)
    ),
    "Physical Health": LOG_LABELS.filter((v) =>
      [
        "Exercise",
        "Illness/Symptoms",
        "Body Temp (subjective)",
        "Menstrual Phase",
      ].includes(v.label)
    ),
    "Substances & Diet": LOG_LABELS.filter((v) =>
      [
        "Caffeine",
        "Alcohol",
        "Nicotine",
        "Cannabis/THC",
        "Medications/Supplements",
        "Big Meal Late",
        "Late Sugar Intake",
        "Intermittent Fasting",
        "Hydration",
      ].includes(v.label)
    ),
    Environment: LOG_LABELS.filter((v) =>
      [
        "Room Temp",
        "Light Exposure",
        "Noise Disturbances",
        "Travel/Jet Lag",
        "Altitude Change",
      ].includes(v.label)
    ),
    "Oura Data": [
      {
        label: "Heart Rate",
        type: "number",
        description: "Resting heart rate data",
        icon: "❤️",
      },
      {
        label: "Sleep Score",
        type: "number",
        description: "Oura sleep score",
        icon: "😴",
      },
      {
        label: "Readiness Score",
        type: "number",
        description: "Oura readiness score",
        icon: "⚡",
      },
      {
        label: "Activity Score",
        type: "number",
        description: "Oura activity score",
        icon: "🏃",
      },
      {
        label: "Deep Sleep",
        type: "number",
        description: "Deep sleep duration",
        icon: "🌙",
      },
      {
        label: "REM Sleep",
        type: "number",
        description: "REM sleep duration",
        icon: "💭",
      },
      {
        label: "Light Sleep",
        type: "number",
        description: "Light sleep duration",
        icon: "😌",
      },
    ],
  };

  if (loading || profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Paper elevation={4} className="p-10 rounded-2xl shadow-lg">
          <Typography variant="h5">You are not logged in.</Typography>
        </Paper>
      </div>
    );
  }

  if (error && !editMode) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Paper elevation={4} className="p-10 rounded-2xl shadow-lg">
          <Typography color="error">{error}</Typography>
        </Paper>
      </div>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        align="center"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <FaUserCircle
          style={{ fontSize: 48, marginRight: 12, verticalAlign: "middle" }}
        />
        Profile & Privacy
      </Typography>

      {/* Profile Section */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Typography variant="h5" component="h2">
            Profile Information
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 4,
          }}
        >
          {/* Avatar Section */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 200,
            }}
          >
            <AvatarUploader
              userId={user.id}
              avatarUrl={profile?.avatar_url || null}
              onUpload={handleAvatarUpload}
            />
          </Box>

          {/* Profile Details */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <b>Email:</b> {user.email}
            </Typography>

            {editMode ? (
              <form
                onSubmit={handleSave}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <TextField
                  label="Username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  helperText={
                    checkingUsername
                      ? "Checking..."
                      : form.username && !usernameAvailable
                      ? "Username is taken"
                      : form.username
                      ? "Username is available"
                      : ""
                  }
                  error={!!form.username && !usernameAvailable}
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
                  InputLabelProps={{ shrink: true }}
                  value={form.date_of_birth}
                  onChange={handleChange}
                  required
                />
                {error && <Typography color="error">{error}</Typography>}
                <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={saving || checkingUsername || !usernameAvailable}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outlined"
                    color="secondary"
                  >
                    Cancel
                  </Button>
                </Box>
              </form>
            ) : (
              <>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <b>Username:</b> {profile?.username}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <b>Name:</b> {profile?.name}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <b>Date of Birth:</b> {profile?.date_of_birth}
                </Typography>
                <Button onClick={handleEdit} variant="contained" sx={{ mt: 2 }}>
                  Edit Profile
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Privacy & Sharing Section (moved from /analytics) */}
      <AnalyzePrivacySection />

      <SharedVariablesViewer
        username={typeof username === "string" ? username : ""}
      />
    </Container>
  );
}
