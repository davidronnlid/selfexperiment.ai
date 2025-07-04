import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supaBase";
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Box,
  CircularProgress,
  IconButton,
  Collapse,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

export default function CommunityProfilePage() {
  const router = useRouter();
  const { username } = router.query;
  const [profile, setProfile] = useState<any>(null);
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [logsByVariable, setLogsByVariable] = useState<Record<string, any[]>>(
    {}
  );
  const [logsLoading, setLogsLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!username) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", username)
        .single();
      setProfile(profileData);
      if (profileData) {
        // Fetch only shared variables for this user
        const { data: sharedVars } = await supabase
          .from("app_variable_sharing_settings")
          .select("variable_name")
          .eq("user_id", profileData.id)
          .eq("is_shared", true);
        setVariables(sharedVars || []);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [username]);

  const handleToggle = async (variable: string) => {
    setExpanded((prev) => ({ ...prev, [variable]: !prev[variable] }));
    if (!expanded[variable] && profile) {
      setLogsLoading((prev) => ({ ...prev, [variable]: true }));
      // Fetch logs for this variable for this user
      const { data: logs, error } = await supabase
        .from("daily_logs")
        .select("date, value, notes")
        .eq("user_id", profile.id)
        .eq("label", variable)
        .order("date", { ascending: false })
        .limit(50);
      console.log("Fetched logs for", variable, logs, error);
      setLogsByVariable((prev) => ({ ...prev, [variable]: logs || [] }));
      setLogsLoading((prev) => ({ ...prev, [variable]: false }));
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h5" align="center" sx={{ mt: 8 }}>
          User not found.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Box sx={{ mb: 2 }}>
        <IconButton onClick={() => window.history.back()} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
      </Box>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          @{profile.username}
        </Typography>
        <Typography align="center" sx={{ mb: 2 }}>
          Shared Variables
        </Typography>
        <List>
          {variables.length === 0 ? (
            <ListItem>
              <ListItemText primary="No shared variables." />
            </ListItem>
          ) : (
            variables.map((v, i) => (
              <Box key={i}>
                <ListItem
                  secondaryAction={
                    <IconButton onClick={() => handleToggle(v.variable_name)}>
                      {expanded[v.variable_name] ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                  }
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleToggle(v.variable_name)}
                >
                  <ListItemText primary={v.variable_name} />
                </ListItem>
                <Collapse
                  in={expanded[v.variable_name] || false}
                  timeout="auto"
                  unmountOnExit
                >
                  <Box sx={{ pl: 4, pb: 2 }}>
                    {logsLoading[v.variable_name] ? (
                      <CircularProgress size={24} />
                    ) : logsByVariable[v.variable_name]?.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No logs shared for this variable.
                      </Typography>
                    ) : (
                      <List dense>
                        {logsByVariable[v.variable_name]?.map((log, idx) => (
                          <ListItem key={idx}>
                            <ListItemText
                              primary={`Value: ${log.value}`}
                              secondary={`Date: ${new Date(
                                log.date
                              ).toLocaleDateString()}${
                                log.notes ? ` | Notes: ${log.notes}` : ""
                              }`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                </Collapse>
              </Box>
            ))
          )}
        </List>
      </Paper>
    </Container>
  );
}
