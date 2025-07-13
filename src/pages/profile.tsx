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
  Card,
  CardContent,
  CardHeader,
  GridLegacy as Grid,
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
        .from("user_variable_preferences")
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
    <Card className="mb-4">
      <CardContent className="p-4 lg:p-6">
        <Typography variant="h6" className="text-white font-semibold mb-3">
          Shared Variables
        </Typography>
        <Box className="flex flex-wrap gap-2">
          {sharedVars.map((v) => (
            <Chip
              key={v.variable_name}
              label={v.variable_name}
              className="bg-gold text-black font-medium"
              size="small"
            />
          ))}
        </Box>
      </CardContent>
    </Card>
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
      setPrivacyLoading(true);

      const { data: varSettings, error: varError } = await supabase
        .from("user_variable_preferences")
        .select("*")
        .eq("user_id", user?.id);

      if (varError) throw varError;

      setVariableSettings(varSettings || []);
    } catch (error) {
      console.error("Error loading privacy settings:", error);
      setError("Failed to load shared variables");
    } finally {
      setPrivacyLoading(false);
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
  };

  const handleCancel = () => {
    setForm(profile!);
    setEditMode(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "username") {
      checkUsername(value);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username: form.username,
        name: form.name,
        date_of_birth: form.date_of_birth,
      });
      if (error) throw error;
      setProfile(form);
      setEditMode(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (filePath: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("id", user.id);
      if (error) throw error;
      setProfile((p) => ({ ...p!, avatar_url: filePath }));
    } catch (error) {
      console.error("Error updating avatar:", error);
    }
  };

  const handleVariableSharingChange = async (
    variableName: string,
    isShared: boolean
  ) => {
    if (!user) return;
    setPrivacySaving(true);
    try {
      // First get the variable ID from the variable name
      const { data: variable, error: varError } = await supabase
        .from("variables")
        .select("id")
        .eq("label", variableName)
        .single();

      if (varError) {
        console.error("Error finding variable:", varError);
        throw new Error("Variable not found");
      }

      const { error } = await supabase
        .from("user_variable_preferences")
        .upsert({
          user_id: user.id,
          variable_id: variable.id,
          is_shared: isShared,
        });
      if (error) throw error;
      setPrivacyMessage({
        type: "success",
        text: `${variableName} ${
          isShared ? "shared" : "unshared"
        } successfully.`,
      });
      setTimeout(() => setPrivacyMessage(null), 3000);
      loadPrivacySettings();
    } catch (error) {
      console.error("Error updating variable sharing:", error);
      setPrivacyMessage({
        type: "error",
        text: "Failed to update variable sharing.",
      });
      setTimeout(() => setPrivacyMessage(null), 3000);
    } finally {
      setPrivacySaving(false);
    }
  };

  const getVariableSharingStatus = (variableName: string) => {
    const setting = variableSettings.find(
      (s) => s.variable_name === variableName
    );
    return setting?.is_shared || false;
  };

  const getSharedVariablesCount = () => {
    return variableSettings.filter((s) => s.is_shared).length;
  };

  useEffect(() => {
    if (user) {
      loadPrivacySettings();
    }
  }, [user]);

  if (loading || profileLoading) {
    return (
      <Container maxWidth="md" className="px-4">
        <Box className="flex items-center justify-center min-h-96">
          <CircularProgress className="text-gold" />
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="md" className="px-4">
        <Box className="text-center">
          <Typography variant="h6" className="text-white">
            Please sign in to view your profile.
          </Typography>
        </Box>
      </Container>
    );
  }

  // If viewing another user's profile
  if (username && username !== profile?.username) {
    return (
      <Container maxWidth="md" className="px-4">
        <Box className="space-y-6">
          <Box className="text-center">
            <Typography
              variant="h3"
              className="font-bold text-white mb-2 text-2xl lg:text-3xl"
            >
              {username}'s Profile
            </Typography>
          </Box>
          <SharedVariablesViewer username={username as string} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" className="px-4">
      <Box className="space-y-6 lg:space-y-8">
        {/* Header Section */}
        <Box className="text-center mb-6 lg:mb-8">
          <Typography
            variant="h3"
            className="font-bold text-white mb-2 text-2xl lg:text-3xl"
          >
            Profile
          </Typography>
          <Typography
            variant="body1"
            className="text-text-secondary text-sm lg:text-base"
          >
            Manage your account and privacy settings
          </Typography>
        </Box>

        {/* Profile Information */}
        <Card>
          <CardHeader
            title={
              <Typography variant="h6" className="text-white font-semibold">
                Profile Information
              </Typography>
            }
            action={
              !editMode && (
                <Button
                  variant="outlined"
                  onClick={handleEdit}
                  className="text-gold border-gold hover:bg-gold/10"
                  size="small"
                >
                  Edit
                </Button>
              )
            }
          />
          <CardContent className="p-4 lg:p-6">
            {error && (
              <Alert severity="error" className="mb-4">
                {error}
              </Alert>
            )}

            <Box className="space-y-6">
              {/* Avatar Section */}
              <Box className="flex flex-col lg:flex-row lg:items-center gap-4">
                <AvatarUploader
                  currentAvatarUrl={profile?.avatar_url}
                  onUpload={handleAvatarUpload}
                />
                <Box className="flex-1">
                  <Typography
                    variant="body2"
                    className="text-text-secondary mb-2"
                  >
                    Profile Picture
                  </Typography>
                  <Typography variant="body2" className="text-text-secondary">
                    Upload a profile picture to personalize your account
                  </Typography>
                </Box>
              </Box>

              {/* Profile Form */}
              <Box component="form" onSubmit={handleSave} className="space-y-4">
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      disabled={!editMode}
                      error={
                        !usernameAvailable &&
                        form.username !== profile?.username
                      }
                      helperText={
                        !usernameAvailable &&
                        form.username !== profile?.username
                          ? "Username is already taken"
                          : checkingUsername
                          ? "Checking availability..."
                          : ""
                      }
                      className="mb-4"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      disabled={!editMode}
                      className="mb-4"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      name="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={handleChange}
                      disabled={!editMode}
                      InputLabelProps={{ shrink: true }}
                      className="mb-4"
                    />
                  </Grid>
                </Grid>

                {editMode && (
                  <Box className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={saving || !usernameAvailable}
                      className="flex-1"
                      size="large"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={saving}
                      className="flex-1"
                      size="large"
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader
            title={
              <Box className="flex items-center gap-2">
                <FaShieldAlt className="text-gold" />
                <Typography variant="h6" className="text-white font-semibold">
                  Privacy Settings
                </Typography>
              </Box>
            }
          />
          <CardContent className="p-4 lg:p-6">
            {privacyMessage && (
              <Alert
                severity={privacyMessage.type}
                className="mb-4"
                onClose={() => setPrivacyMessage(null)}
              >
                {privacyMessage.text}
              </Alert>
            )}

            <Box className="space-y-4">
              <Typography variant="body2" className="text-text-secondary mb-4">
                Control which variables you want to share with the community.
                Shared variables will be visible to other users.
              </Typography>

              {user && <VariableSharingManager user={user} />}

              <Box className="mt-6">
                <Typography
                  variant="h6"
                  className="text-white font-semibold mb-3"
                >
                  Privacy Analysis
                </Typography>
                <AnalyzePrivacySection />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
