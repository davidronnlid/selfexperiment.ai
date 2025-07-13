import React, { useState, useEffect } from "react";
import { Button, IconButton, CircularProgress, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Close";
import { validateValue, getInputProps } from "@/utils/logLabels";
import { Variable } from "@/types/variables";

interface RoutineVariableLogEditorProps {
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  variable: Variable;
  loading?: boolean;
  error?: string;
}

const RoutineVariableLogEditor: React.FC<RoutineVariableLogEditorProps> = ({
  value,
  onChange,
  onSave,
  onDelete,
  onCancel,
  variable,
  loading = false,
  error = "",
}) => {
  const [localValue, setLocalValue] = useState(value || "");
  const [validationError, setValidationError] = useState<string>("");

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  useEffect(() => {
    const validation = validateValue(variable.label, localValue);
    setValidationError(
      validation.isValid ? "" : validation.error || "Invalid value"
    );
  }, [localValue, variable]);

  const inputProps = getInputProps(variable.label);

  const handleIncrement = () => {
    if (inputProps.type === "number") {
      const step = inputProps.step ? parseFloat(String(inputProps.step)) : 1;
      const newValue = (parseFloat(localValue || "0") + step).toString();
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    if (inputProps.type === "number") {
      const step = inputProps.step ? parseFloat(String(inputProps.step)) : 1;
      const newValue = (parseFloat(localValue || "0") - step).toString();
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {inputProps.type === "number" && (
        <Tooltip title="Decrement">
          <span>
            <IconButton
              size="small"
              onClick={handleDecrement}
              disabled={
                loading ||
                (inputProps.min !== undefined &&
                  parseFloat(localValue || "0") <= Number(inputProps.min))
              }
            >
              <RemoveIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}
      <input
        {...inputProps}
        value={localValue}
        onChange={handleInputChange}
        disabled={loading}
        style={{
          width: 80,
          padding: 4,
          borderRadius: 4,
          border: "1px solid #ccc",
        }}
      />
      {inputProps.type === "number" && (
        <Tooltip title="Increment">
          <span>
            <IconButton
              size="small"
              onClick={handleIncrement}
              disabled={
                loading ||
                (inputProps.max !== undefined &&
                  parseFloat(localValue || "0") >= Number(inputProps.max))
              }
            >
              <AddIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}
      <Tooltip title="Save">
        <span>
          <IconButton
            color="primary"
            size="small"
            onClick={onSave}
            disabled={loading || !!validationError}
          >
            {loading ? <CircularProgress size={18} /> : <SaveIcon />}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Cancel">
        <span>
          <IconButton size="small" onClick={onCancel} disabled={loading}>
            <CancelIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Delete">
        <span>
          <IconButton size="small" onClick={onDelete} disabled={loading}>
            <DeleteIcon />
          </IconButton>
        </span>
      </Tooltip>
      <div
        style={{
          color: validationError ? "#e53935" : "#888",
          fontSize: 12,
          marginLeft: 8,
        }}
      >
        {validationError
          ? validationError
          : inputProps.min !== undefined && inputProps.max !== undefined
          ? `Allowed: ${inputProps.min} to ${inputProps.max}`
          : inputProps.placeholder}
      </div>
    </div>
  );
};

export default RoutineVariableLogEditor;
