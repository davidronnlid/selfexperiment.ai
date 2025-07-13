import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Typography,
  Box,
} from "@mui/material";
import { supabase } from "@/utils/supaBase";

interface VariableReportDialogProps {
  open: boolean;
  onClose: () => void;
  variableId: string;
  variableName: string;
  user: any;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or promotional content" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "misleading", label: "Misleading health claims" },
  { value: "duplicate", label: "Duplicate of existing variable" },
  { value: "other", label: "Other (please specify)" },
];

export default function VariableReportDialog({
  open,
  onClose,
  variableId,
  variableName,
  user,
}: VariableReportDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!reason) {
      setError("Please select a reason for reporting");
      return;
    }

    if (reason === "other" && !details.trim()) {
      setError("Please provide details for your report");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create a report record
      const { error: reportError } = await supabase
        .from("variable_reports")
        .insert({
          variable_id: variableId,
          reporter_id: user.id,
          reason,
          details: details.trim() || null,
          status: "pending",
          created_at: new Date().toISOString(),
        });

      if (reportError) {
        throw reportError;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setReason("");
        setDetails("");
      }, 2000);
    } catch (error) {
      console.error("Error submitting report:", error);
      setError("Failed to submit report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setReason("");
      setDetails("");
      setError("");
      setSuccess(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Report Variable</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            You are reporting: <strong>{variableName}</strong>
          </Typography>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Report submitted successfully. Thank you for helping keep our
            community safe.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend">
            Why are you reporting this variable?
          </FormLabel>
          <RadioGroup
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REPORT_REASONS.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={option.label}
              />
            ))}
          </RadioGroup>
        </FormControl>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Additional details (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Please provide any additional context that might help us review this report..."
          sx={{ mb: 2 }}
        />

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Our commitment:</strong> We review all reports carefully and
            take action only when necessary. We respect free speech and will not
            remove content simply because it's controversial. Reports are used
            to identify genuine spam, abuse, or misleading health claims.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || success}
        >
          {loading ? "Submitting..." : "Submit Report"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
