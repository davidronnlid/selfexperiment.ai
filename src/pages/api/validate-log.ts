import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supaBase";
import {
  validateVariableValue,
  type Variable as ValidationVariable,
} from "@/utils/variableValidation";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { variableId, value } = req.body;

    if (!variableId || value === undefined) {
      return res.status(400).json({
        error: "Variable ID and value are required",
      });
    }

    // Fetch the variable from the database
    const { data: variable, error: fetchError } = await supabase
      .from("variables")
      .select("*")
      .eq("id", variableId)
      .single();

    if (fetchError) {
      console.error("Error fetching variable:", fetchError);
      return res.status(404).json({
        error: "Variable not found",
      });
    }

    // Validate the value against the variable constraints
    const validationResult = validateVariableValue(
      value,
      variable as ValidationVariable
    );

    return res.status(200).json({
      isValid: validationResult.isValid,
      error: validationResult.error,
      variable: {
        id: variable.id,
        label: variable.label,
        data_type: variable.data_type,
      },
    });
  } catch (error) {
    console.error("Validation error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
