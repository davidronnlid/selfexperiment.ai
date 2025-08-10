import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Chip,
  Stack,
  Tooltip,
  IconButton,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import UndoIcon from "@mui/icons-material/Undo";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import { supabase } from "@/utils/supaBase";
import ValidatedVariableInput from "@/components/ValidatedVariableInput";
import type { Variable as ValidationVariable } from "@/utils/variableValidation";
import { getEffectiveUnit, saveUserUnitPreference } from "@/utils/userUnitPreferences";
import type { UserUnitPreference } from "@/utils/userUnitPreferences";
import Link from "next/link";

interface AutoTrackedConfirmListProps {
  userId: string;
}

interface AutoPointItem {
  id: string;
  date: string;
  created_at?: string;
  variable_id: string;
  value: string;
  source: string | string[] | null;
  confirmed?: boolean;
  variables?: {
    label: string;
    slug: string;
  };
}

export default function AutoTrackedConfirmList({ userId }: AutoTrackedConfirmListProps) {
  const [items, setItems] = useState<AutoPointItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [variableMap, setVariableMap] = useState<Record<string, ValidationVariable>>({});
  const [isValidMap, setIsValidMap] = useState<Record<string, boolean>>({});
  const [userUnitsMap, setUserUnitsMap] = useState<Record<string, UserUnitPreference>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ALL recent data points for this user
      // Use left join for variables to handle cases where variable might not exist
      const { data, error } = await supabase
        .from("data_points")
        .select("id, date, created_at, variable_id, value, source, confirmed, variables(label, slug)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200); // Get more to ensure we catch auto-tracked ones

      if (error) {
        console.error("Error fetching data points:", error);
        setItems([]);
        return;
      }

      console.log("All data points fetched:", data?.length || 0);
      
      const isAutoTracked = (src: string | string[] | null): boolean => {
        if (!src) return false;
        const needles = ["routine", "auto", "oura", "withings", "apple_health"]; // All non-manual sources
        if (Array.isArray(src)) {
          const normalized = src.map((s) => (s || "").toString().toLowerCase());
          return needles.some((n) => normalized.includes(n));
        }
        const s = src.toString().toLowerCase();
        return needles.some((n) => s.includes(n));
      };

      const filtered = (data || []).filter((d: any) => isAutoTracked(d.source));
      console.log("Auto-tracked data points found:", filtered.length);
      
      // Log some examples for debugging
      if (filtered.length > 0) {
        console.log("Sample auto-tracked items:", filtered.slice(0, 3).map(f => ({
          id: f.id,
          value: f.value,
          source: f.source,
          confirmed: f.confirmed,
          created_at: f.created_at
        })));
      }

      // Take the 15 most recent auto-tracked items
      const latest = filtered.slice(0, 15) as AutoPointItem[];
      setItems(latest);
      // Initialize editable values
      const initialEdits: Record<string, string> = {};
      latest.forEach((i) => {
        initialEdits[i.id] = i.value ?? "";
      });
      setEditedValues(initialEdits);

      // Fetch variable metadata for validation & unit-aware inputs
      const uniqueVarIds = Array.from(new Set(latest.map((i) => i.variable_id)));
      if (uniqueVarIds.length > 0) {
        const { data: vars, error: varErr } = await supabase
          .from("variables")
          .select("id,label,data_type,validation_rules,default_display_unit")
          .in("id", uniqueVarIds);
        if (!varErr && Array.isArray(vars)) {
          const map: Record<string, ValidationVariable> = {};
          const unitsMap: Record<string, UserUnitPreference> = {};
          
          for (const v of vars as any[]) {
            // Heuristic fallbacks
            const variable: ValidationVariable = {
              id: v.id,
              label: v.label,
              data_type: v.data_type || "text",
              validation_rules: v.validation_rules || undefined,
              canonical_unit: v.default_display_unit || undefined,
              icon: undefined,
            };
            // If Mood lacks rules, enforce 1-10 scale
            if (
              (!variable.validation_rules || Object.keys(variable.validation_rules).length === 0) &&
              typeof variable.label === "string" &&
              variable.label.toLowerCase().includes("mood")
            ) {
              variable.validation_rules = { scaleMin: 1, scaleMax: 10 } as any;
            }
            map[variable.id] = variable;
            
            // Get user's preferred unit for this variable
            try {
              const { unit } = await getEffectiveUnit(userId, v.id);
              if (unit) {
                unitsMap[v.id] = unit;
              }
            } catch (err) {
              console.warn(`Failed to get effective unit for variable ${v.id}:`, err);
            }
          }
          setVariableMap(map);
          setUserUnitsMap(unitsMap);
        }
      }
    } catch (e) {
      console.error("Failed to load auto-tracked data points", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId, load]);

  const handleValueChange = (id: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleValidationChange = (id: string, isValid: boolean) => {
    setIsValidMap((prev) => ({ ...prev, [id]: isValid }));
  };

  const handleUnitChange = async (variableId: string, unitId: string, unitGroup: string) => {
    try {
      const { success } = await saveUserUnitPreference(userId, variableId, unitId, unitGroup);
      if (success) {
        // Update the local units map
        const { unit } = await getEffectiveUnit(userId, variableId);
        if (unit) {
          setUserUnitsMap((prev) => ({ ...prev, [variableId]: unit }));
        }
      }
    } catch (err) {
      console.error("Failed to save unit preference:", err);
    }
  };

  const setUpdating = (id: string, val: boolean) => {
    setUpdatingIds((prev) => ({ ...prev, [id]: val }));
  };

  // For pending items: confirm + persist edited value
  const confirmWithValue = async (id: string) => {
    const newValue = editedValues[id];
    try {
      setUpdating(id, true);
      const { error } = await supabase
        .from("data_points")
        .update({ value: newValue, confirmed: true })
        .eq("id", id);
      if (error) throw error;
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, value: newValue, confirmed: true } : i))
      );
    } catch (e) {
      console.error("Failed to confirm with edited value", e);
    } finally {
      setUpdating(id, false);
    }
  };

  const unconfirm = async (id: string) => {
    try {
      setUpdating(id, true);
      const { error } = await supabase
        .from("data_points")
        .update({ confirmed: false })
        .eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, confirmed: false } : i)));
    } catch (e) {
      console.error("Failed to unconfirm data point", e);
    } finally {
      setUpdating(id, false);
    }
  };

  // Always render the card so the section is visible on the page

  return (
    <Card className="mb-4 border border-border bg-surface" sx={{ mt: 3 }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" className="text-white font-semibold tracking-tight">
              Latest auto-tracked values
            </Typography>
          </Box>
        }
      />
      <CardContent sx={{ pt: 0.5, pb: 1 }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No auto-tracked values found yet. Connect health data sources or set up routines to see auto-tracked data here.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {items.map((i) => (
              <Box
                key={i.id}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 1,
                  py: 0.75,
                  borderLeft: `3px solid ${i.confirmed ? "#10b981" : "#f59e0b"}`,
                  backgroundColor: i.confirmed
                    ? "rgba(16,185,129,0.06)"
                    : "rgba(245,158,11,0.06)",
                  borderRadius: 1,
                }}
              >
                <Box sx={{ mr: 1 }}>
                  {i.variables?.slug ? (
                    <Link href={`/variable/${i.variables.slug}`} style={{ textDecoration: 'none' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600, 
                          lineHeight: 1.2,
                          color: 'primary.main',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {i.variables.label || `Variable ${i.variable_id.substring(0, 8)}...`}
                      </Typography>
                    </Link>
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                      {i.variables?.label || `Variable ${i.variable_id.substring(0, 8)}...`}
                    </Typography>
                  )}
                  <Box display="flex" alignItems="center" gap={1} mt={0.25}>
                    <Box sx={{ minWidth: 180 }}>
                      <ValidatedVariableInput
                        variable={
                          variableMap[i.variable_id] || {
                            id: i.variable_id,
                            label: i.variables?.label || `Variable ${i.variable_id.substring(0, 8)}...`,
                            data_type: "text",
                          }
                        }
                        value={editedValues[i.id] ?? i.value ?? ""}
                        onChange={(val) => handleValueChange(i.id, val)}
                        onValidationChange={(valid) => handleValidationChange(i.id, valid)}
                        selectedUnit={userUnitsMap[i.variable_id]?.unit_id || variableMap[i.variable_id]?.canonical_unit}
                        size="small"
                        showConstraints={false}
                        allowRealTimeValidation={true}
                      />
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                    {new Date(i.created_at || i.date).toLocaleString()} • {Array.isArray(i.source) ? i.source.join(", ") : i.source}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Chip
                    size="small"
                    variant={i.confirmed ? "filled" : "outlined"}
                    color={i.confirmed ? "success" : "warning"}
                    icon={i.confirmed ? <CheckCircleIcon /> : <PendingIcon />}
                    label={i.confirmed ? "Confirmed" : "Pending"}
                    sx={{ height: 22 }}
                  />
                  <Tooltip title="Confirm and save value">
                    <span>
                      <IconButton
                        size="small"
                        color="success"
                        disabled={!!updatingIds[i.id] || isValidMap[i.id] === false}
                        onClick={() => confirmWithValue(i.id)}
                        aria-label="confirm value"
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {i.confirmed && (
                    <Tooltip title="Mark as unconfirmed">
                      <span>
                        <IconButton
                          size="small"
                          sx={{
                            color: '#f59e0b',
                            '&:hover': {
                              color: '#fbbf24',
                              backgroundColor: 'rgba(245,158,11,0.10)'
                            },
                            '&.Mui-disabled': {
                              color: 'rgba(245,158,11,0.40)'
                            }
                          }}
                          disabled={!!updatingIds[i.id]}
                          onClick={() => unconfirm(i.id)}
                          aria-label="unconfirm value"
                        >
                          <UndoIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}



