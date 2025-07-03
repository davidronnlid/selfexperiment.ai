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
}

export function useVariableSharingSettings(userId: string) {
  const [settings, setSettings] = useState<VariableSharingSetting[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchVariableSharingSettings(userId);
    setSettings((data as VariableSharingSetting[]) || []);
    setLoading(false);
  }, [userId]);

  const update = useCallback(
    async (
      variableName: string,
      isShared: boolean,
      variableType: string,
      category?: string
    ) => {
      await upsertVariableSharingSetting({
        userId,
        variableName,
        isShared,
        variableType,
        category,
      });
      await load();
    },
    [userId, load]
  );

  return { settings, loading, load, update };
}
