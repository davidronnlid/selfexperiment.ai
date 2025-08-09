import React, { useEffect, useState, useCallback } from "react";
import { Box, Card, CardHeader, CardContent, Typography, Button, Chip, Stack } from "@mui/material";
import { supabase } from "@/utils/supaBase";

interface AutoTrackedConfirmListProps {
  userId: string;
}

interface AutoPointItem {
  id: string;
  date: string;
  variable_id: string;
  value: string;
  source: string | string[] | null;
}

export default function AutoTrackedConfirmList({ userId }: AutoTrackedConfirmListProps) {
  const [items, setItems] = useState<AutoPointItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("data_points")
        .select("id, date, variable_id, value, source")
        .eq("user_id", userId)
        .eq("confirmed", false)
        .order("date", { ascending: false })
        .limit(200);

      if (error) throw error;
      setItems((data || []) as AutoPointItem[]);
    } catch (e) {
      console.error("Failed to load pending confirmations", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId, load]);

  const confirmOne = async (id: string) => {
    try {
      await supabase.from("data_points").update({ confirmed: true }).eq("id", id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error("Failed to confirm data point", e);
    }
  };

  const confirmAll = async () => {
    if (items.length === 0) return;
    try {
      const ids = items.map((i) => i.id);
      await supabase.from("data_points").update({ confirmed: true }).in("id", ids);
      setItems([]);
    } catch (e) {
      console.error("Failed to confirm all", e);
    }
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <Card className="mb-6 border border-border bg-surface" sx={{ mt: 4 }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" className="text-white font-semibold">
              Pending confirmations
            </Typography>
            <Button variant="contained" size="small" onClick={confirmAll}>
              Confirm all ({items.length})
            </Button>
          </Box>
        }
      />
      <CardContent>
        <Stack spacing={1.5}>
          {items.map((i) => (
            <Box key={i.id} display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {i.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(i.date).toLocaleDateString()} • {Array.isArray(i.source) ? i.source[0] : i.source}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip size="small" color="warning" label="auto-tracked" />
                <Button variant="outlined" size="small" onClick={() => confirmOne(i.id)}>
                  Confirm
                </Button>
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}


