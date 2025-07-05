import { useState, useCallback } from "react";
import {
  fetchVariableSharingSettings,
  upsertVariableSharingSetting,
} from "../utils/privacyApi";

export interface VariableSharingSetting {
  variable_name: string;
  is_shared: boolean;
  variable_type: string;
  category?: string;
  variable_id?: string;
  label?: string;
  icon?: string;
}

export function useVariableSharingSettings(userId: string) {
  const [settings, setSettings] = useState<VariableSharingSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await fetchVariableSharingSettings(
        userId
      );

      if (fetchError) {
        setError(fetchError.message);
        setSettings([]);
      } else {
        setSettings((data as VariableSharingSetting[]) || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const update = useCallback(
    async (
      variableName: string,
      isShared: boolean,
      variableType: string,
      category?: string
    ) => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await upsertVariableSharingSetting({
          userId,
          variableName,
          isShared,
          variableType,
          category,
        });

        if (updateError) {
          setError(updateError.message);
        } else {
          await load(); // Reload settings after update
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update setting"
        );
      } finally {
        setLoading(false);
      }
    },
    [userId, load]
  );

  return { settings, loading, error, load, update };
}
