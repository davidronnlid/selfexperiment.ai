import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/pages/_app";
import { getUserDisplayUnit, clearDisplayUnitCache } from "@/utils/variableUtils";
import { Variable } from "@/types/variables";

interface UseUserDisplayUnitReturn {
  displayUnit: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get and manage user's preferred display unit for a variable
 */
export function useUserDisplayUnit(
  variableId: string,
  variable?: Variable
): UseUserDisplayUnitReturn {
  const { user } = useUser();
  const [displayUnit, setDisplayUnit] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisplayUnit = useCallback(async () => {
    if (!user || !variableId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const unit = await getUserDisplayUnit(user.id, variableId, variable);
      setDisplayUnit(unit);
    } catch (err) {
      console.error("Failed to fetch display unit:", err);
      setError("Failed to load display unit preference");
      setDisplayUnit(variable?.canonical_unit || "");
    } finally {
      setLoading(false);
    }
  }, [user, variableId, variable]);

  useEffect(() => {
    fetchDisplayUnit();
  }, [user?.id, variableId, variable?.canonical_unit, fetchDisplayUnit]);

  const refetch = async () => {
    // Clear cache and refetch
    if (user && variableId) {
      clearDisplayUnitCache(user.id, variableId);
    }
    await fetchDisplayUnit();
  };

  return {
    displayUnit,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook to format a variable value with user's preferred display unit
 */
export function useFormattedVariableValue(
  value: string | number,
  variableId: string,
  variable?: Variable
): {
  formattedValue: string;
  unit: string;
  loading: boolean;
} {
  const { displayUnit, loading } = useUserDisplayUnit(variableId, variable);
  
  const formattedValue = typeof value === "number" ? value.toString() : value;
  
  return {
    formattedValue,
    unit: displayUnit,
    loading,
  };
} 