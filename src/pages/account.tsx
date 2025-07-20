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
  Autocomplete,
} from "@mui/material";
import Grid from "@mui/material/Grid";
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
import SimpleVariableSharing from "../components/SimpleVariableSharing";
import NotificationManager from "../components/NotificationManager";

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

interface Profile {
  username: string;
  name: string;
  email: string;
  date_of_birth: string;
  avatar_url?: string | null;
  timezone: string;
}

// Helper function to detect if user signed up with Google OAuth
const isGoogleAuthUser = (user: any): boolean => {
  // Check if user has Google provider in app_metadata
  if (user?.app_metadata?.providers?.includes("google")) {
    return true;
  }

  // Check if user has Google OAuth metadata
  if (user?.user_metadata?.iss === "https://accounts.google.com") {
    return true;
  }

  // Check if user metadata contains Google-specific fields
  if (
    user?.user_metadata?.picture &&
    user?.user_metadata?.picture.includes("googleusercontent.com")
  ) {
    return true;
  }

  return false;
};

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

export default function AccountPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Profile>({
    username: "",
    name: "",
    email: "",
    date_of_birth: "",
    avatar_url: null,
    timezone: "",
  });
  const [saving, setSaving] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Email-related state
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [originalEmail, setOriginalEmail] = useState("");

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

      // Detect if user is a Google OAuth user
      const googleUser = isGoogleAuthUser(user);
      setIsGoogleUser(googleUser);
      setOriginalEmail(user.email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("username, name, date_of_birth, avatar_url, timezone, email")
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
        const profileWithEmail = {
          ...data,
          email: data.email || user.email || "", // Use profile email first, fallback to auth email
          timezone:
            data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        setProfile(profileWithEmail);
        setForm(profileWithEmail);
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

  const handleTimezoneChange = (event: any, newValue: string | null) => {
    setForm((f) => ({ ...f, timezone: newValue || "" }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setEmailConfirmationSent(false);

    try {
      let emailChanged = false;

      // Handle email changes (only for non-Google users)
      if (!isGoogleUser && form.email !== originalEmail) {
        console.log("Email change detected for non-Google user");
        const { error: emailError } = await supabase.auth.updateUser({
          email: form.email,
        });
        if (emailError) throw emailError;
        emailChanged = true;
        setEmailConfirmationSent(true);
      }

      // Update profile in database including email
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username: form.username,
        name: form.name,
        date_of_birth: form.date_of_birth,
        timezone: form.timezone,
        email: form.email, // Save email to profile table
      });
      if (error) throw error;

      setProfile(form);
      setEditMode(false);

      // Show success message
      if (emailChanged) {
        setError(""); // Clear any previous errors
        // The email confirmation message will be shown via the emailConfirmationSent state
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      if (error.message?.includes("email")) {
        setError(
          "Failed to update email. Please check that the email address is valid and not already in use."
        );
      } else {
        setError("Failed to save profile. Please try again.");
      }
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
            Please sign in to view your account.
          </Typography>
        </Box>
      </Container>
    );
  }

  // If viewing another user's account
  if (username && username !== profile?.username) {
    return (
      <Container maxWidth="md" className="px-4">
        <Box className="space-y-6">
          <Box className="text-center">
            <Typography
              variant="h3"
              className="font-bold text-white mb-2 text-2xl lg:text-3xl"
            >
              {username}'s Account
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
            Account
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
                Account Information
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
                  <Grid size={{ xs: 12, md: 6 }}>
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
                  <Grid size={{ xs: 12, md: 6 }}>
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
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={!editMode || isGoogleUser}
                      className="mb-4"
                      helperText={
                        isGoogleUser
                          ? "Email cannot be changed for Google-linked accounts"
                          : emailConfirmationSent
                          ? "✅ Confirmation email sent to your new address. Please check your email to verify the change."
                          : editMode && !isGoogleUser
                          ? "Changing your email will require email confirmation"
                          : ""
                      }
                      FormHelperTextProps={{
                        sx: {
                          color: emailConfirmationSent
                            ? "success.main"
                            : isGoogleUser
                            ? "text.secondary"
                            : "text.secondary",
                          fontWeight: emailConfirmationSent ? "bold" : "normal",
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
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
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Autocomplete
                      options={COMMON_TIMEZONES}
                      value={form.timezone}
                      onChange={handleTimezoneChange}
                      freeSolo
                      disabled={!editMode}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Timezone"
                          helperText="Your timezone for accurate tracking times"
                          className="mb-4"
                        />
                      )}
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

        {/* Notification Settings */}
        <Card>
          <CardHeader
            title={
              <Box className="flex items-center gap-2">
                <FaExclamationTriangle className="text-gold" />
                <Typography variant="h6" className="text-white font-semibold">
                  Notification Settings
                </Typography>
              </Box>
            }
          />
          <CardContent className="p-4 lg:p-6">
            <Typography variant="body2" className="text-text-secondary mb-4">
              Configure push notifications for reminders, insights, and updates.
            </Typography>
            {user && <NotificationManager userId={user.id} />}
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
            <Typography variant="body2" className="text-text-secondary mb-4">
              Control which variables are shared with other users.
            </Typography>
            <SimpleVariableSharing userId={user.id} />
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
