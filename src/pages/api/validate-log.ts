import { NextApiRequest, NextApiResponse } from "next";
import { validateValue } from "@/utils/logLabels";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { label, value } = req.body;

    if (!label || typeof label !== "string") {
      return res
        .status(400)
        .json({ error: "Label is required and must be a string" });
    }

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "Value is required" });
    }

    const validation = validateValue(label, value.toString());

    return res.status(200).json({
      isValid: validation.isValid,
      error: validation.error || null,
      label,
      value: value.toString(),
    });
  } catch (error) {
    console.error("Validation error:", error);
    return res.status(500).json({
      error: "Internal server error",
      isValid: false,
    });
  }
}
