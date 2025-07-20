import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Skeleton,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { useUser } from "../pages/_app";
import {
  getVariableSynonyms,
  addVariableSynonym,
  removeVariableSynonym,
  isValidSynonym,
} from "../utils/variableSearchUtils";
import type { Variable } from "../types/variables";

interface VariableSynonymsManagerProps {
  variable: Variable;
  open: boolean;
  onClose: () => void;
  onSynonymsUpdated?: () => void;
}

interface SynonymItem {
  id: string;
  synonymLabel: string;
  synonymType: string;
  isPrimary: boolean;
  searchWeight: number;
  createdAt: string;
}

export default function VariableSynonymsManager({
  variable,
  open,
  onClose,
  onSynonymsUpdated,
}: VariableSynonymsManagerProps) {
  const { user } = useUser();
  const [synonyms, setSynonyms] = useState<SynonymItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSynonym, setNewSynonym] = useState("");
  const [newSynonymType, setNewSynonymType] = useState<"user" | "common">(
    "user"
  );
  const [newSearchWeight, setNewSearchWeight] = useState(1);
  const [editingSynonym, setEditingSynonym] = useState<SynonymItem | null>(
    null
  );
  const [editValue, setEditValue] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Load synonyms when component opens
  useEffect(() => {
    if (open && variable?.id) {
      loadSynonyms();
    }
  }, [open, variable?.id]);

  const loadSynonyms = async () => {
    if (!variable?.id) return;

    setLoading(true);
    try {
      const synonymsData = await getVariableSynonyms(variable.id, {
        language: "en",
        includeInactive: false,
      });
      setSynonyms(synonymsData);
    } catch (error) {
      console.error("Failed to load synonyms:", error);
      setMessage({
        type: "error",
        text: "Failed to load synonyms",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSynonym = async () => {
    if (!user?.id || !variable?.id || !newSynonym.trim()) return;

    if (!isValidSynonym(newSynonym)) {
      setMessage({
        type: "error",
        text: "Synonym must be between 2 and 100 characters",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await addVariableSynonym(variable.id, newSynonym, {
        synonymType: newSynonymType,
        searchWeight: newSearchWeight,
        userId: user.id,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: "Synonym added successfully",
        });
        setNewSynonym("");
        setNewSynonymType("user");
        setNewSearchWeight(1);
        await loadSynonyms();
        onSynonymsUpdated?.();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to add synonym",
        });
      }
    } catch (error) {
      console.error("Failed to add synonym:", error);
      setMessage({
        type: "error",
        text: "Failed to add synonym",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSynonym = async () => {
    if (!user?.id || !variable?.id || !editingSynonym || !editValue.trim())
      return;

    if (!isValidSynonym(editValue)) {
      setMessage({
        type: "error",
        text: "Synonym must be between 2 and 100 characters",
      });
      return;
    }

    setLoading(true);
    try {
      // Remove old synonym and add new one
      const removeResult = await removeVariableSynonym(
        variable.id,
        editingSynonym.synonymLabel,
        { userId: user.id }
      );

      if (removeResult.success) {
        const addResult = await addVariableSynonym(variable.id, editValue, {
          synonymType: editingSynonym.synonymType as "user" | "common",
          searchWeight: editingSynonym.searchWeight,
          userId: user.id,
        });

        if (addResult.success) {
          setMessage({
            type: "success",
            text: "Synonym updated successfully",
          });
          setEditingSynonym(null);
          setEditValue("");
          await loadSynonyms();
          onSynonymsUpdated?.();
        } else {
          setMessage({
            type: "error",
            text: addResult.error || "Failed to update synonym",
          });
        }
      } else {
        setMessage({
          type: "error",
          text: removeResult.error || "Failed to update synonym",
        });
      }
    } catch (error) {
      console.error("Failed to edit synonym:", error);
      setMessage({
        type: "error",
        text: "Failed to edit synonym",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSynonym = async (synonym: SynonymItem) => {
    if (!user?.id || !variable?.id) return;

    // Don't allow deletion of system synonyms or primary labels
    if (synonym.synonymType === "system" || synonym.isPrimary) {
      setMessage({
        type: "error",
        text: "Cannot delete system synonyms or primary labels",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await removeVariableSynonym(
        variable.id,
        synonym.synonymLabel,
        { userId: user.id }
      );

      if (result.success) {
        setMessage({
          type: "success",
          text: "Synonym removed successfully",
        });
        await loadSynonyms();
        onSynonymsUpdated?.();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to remove synonym",
        });
      }
    } catch (error) {
      console.error("Failed to remove synonym:", error);
      setMessage({
        type: "error",
        text: "Failed to remove synonym",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (synonym: SynonymItem) => {
    setEditingSynonym(synonym);
    setEditValue(synonym.synonymLabel);
  };

  const cancelEditing = () => {
    setEditingSynonym(null);
    setEditValue("");
  };

  const getSynonymTypeColor = (type: string) => {
    switch (type) {
      case "system":
        return "primary";
      case "user":
        return "secondary";
      case "common":
        return "success";
      default:
        return "default";
    }
  };

  const getSynonymTypeLabel = (type: string) => {
    switch (type) {
      case "system":
        return "System";
      case "user":
        return "User";
      case "common":
        return "Common";
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <InfoIcon />
          <Typography variant="h6">
            Manage Synonyms for "{variable?.label}"
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {message && (
          <Alert
            severity={message.type}
            sx={{ mb: 2 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Synonyms allow users to find this variable using different names or
          terms. For example, "Weight" could have synonyms like "Body Weight",
          "Mass", or "Scale Weight".
        </Typography>

        {/* Add new synonym */}
        <Box
          sx={{
            mb: 3,
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Add New Synonym
          </Typography>
          <Box display="flex" gap={2} alignItems="flex-end">
            <TextField
              label="Synonym"
              value={newSynonym}
              onChange={(e) => setNewSynonym(e.target.value)}
              placeholder="e.g., Body Weight"
              size="small"
              sx={{ flexGrow: 1 }}
              disabled={loading}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={newSynonymType}
                onChange={(e) =>
                  setNewSynonymType(e.target.value as "user" | "common")
                }
                label="Type"
                disabled={loading}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="common">Common</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Weight</InputLabel>
              <Select
                value={newSearchWeight}
                onChange={(e) => setNewSearchWeight(e.target.value as number)}
                label="Weight"
                disabled={loading}
              >
                <MenuItem value={1}>Low</MenuItem>
                <MenuItem value={5}>Medium</MenuItem>
                <MenuItem value={10}>High</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddSynonym}
              disabled={loading || !newSynonym.trim()}
              size="small"
            >
              Add
            </Button>
          </Box>
        </Box>

        {/* Existing synonyms */}
        <Typography variant="subtitle2" gutterBottom>
          Existing Synonyms ({synonyms.length})
        </Typography>

        {loading ? (
          <Box>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={60}
                sx={{ mb: 1 }}
              />
            ))}
          </Box>
        ) : synonyms.length === 0 ? (
          <Alert severity="info">
            No synonyms found. Add some synonyms to help users find this
            variable more easily.
          </Alert>
        ) : (
          <List>
            {synonyms.map((synonym, index) => (
              <React.Fragment key={synonym.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {synonym.isPrimary && (
                          <Tooltip title="Primary Label">
                            <StarIcon color="primary" fontSize="small" />
                          </Tooltip>
                        )}
                        <Typography variant="body1">
                          {editingSynonym?.id === synonym.id ? (
                            <TextField
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              size="small"
                              fullWidth
                              autoFocus
                            />
                          ) : (
                            synonym.synonymLabel
                          )}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box display="flex" gap={1} mt={0.5}>
                        <Chip
                          label={getSynonymTypeLabel(synonym.synonymType)}
                          color={getSynonymTypeColor(synonym.synonymType)}
                          size="small"
                        />
                        <Chip
                          label={`Weight: ${synonym.searchWeight}`}
                          variant="outlined"
                          size="small"
                        />
                        {synonym.synonymType === "user" && (
                          <Chip
                            label="User Created"
                            variant="outlined"
                            size="small"
                            color="secondary"
                          />
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {editingSynonym?.id === synonym.id ? (
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={handleEditSynonym}
                          disabled={loading}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={cancelEditing}
                          disabled={loading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box display="flex" gap={1}>
                        {synonym.synonymType !== "system" &&
                          !synonym.isPrimary && (
                            <IconButton
                              size="small"
                              onClick={() => startEditing(synonym)}
                              disabled={loading}
                            >
                              <EditIcon />
                            </IconButton>
                          )}
                        {synonym.synonymType !== "system" &&
                          !synonym.isPrimary && (
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteSynonym(synonym)}
                              disabled={loading}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                      </Box>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
                {index < synonyms.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
