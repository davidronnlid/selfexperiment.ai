import { useState, useCallback } from "react";
import {
  fetchVariableSharingSettings,
  upsertUserVariablePreference,
} from "../utils/privacyApi";

export interface UserVariablePreference {
  variable_name: string;
  is_shared: boolean;
  variable_type: string;
  category?: string;
  variable_id?: string;
  label?: string;
  icon?: string;
  preferred_unit?: string;
  display_name?: string;
  is_favorite?: boolean;
}

export function useUserVariablePreferences(userId: string) {
  const [preferences, setPreferences] = useState<UserVariablePreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchVariableSharingSettings(
        userId
      );
      
      setPreferences(data as unknown as UserVariablePreference[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load preferences"
      );
      setPreferences([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const update = useCallback(
    async (
      variableName: string,
      isShared: boolean,
      variableType: string,
      category?: string,
      preferredUnit?: string,
      displayName?: string,
      isFavorite?: boolean
    ) => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await upsertUserVariablePreference({
          userId,
          variableName,
          isShared,
          variableType,
          category,
          preferredUnit,
          displayName,
          isFavorite,
        });

        if (updateError) {
          setError(updateError.message);
        } else {
          await load(); // Reload preferences after update
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update preference"
        );
      } finally {
        setLoading(false);
      }
    },
    [userId, load]
  );

  return { preferences, loading, error, load, update };
}
