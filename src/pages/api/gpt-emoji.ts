import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  const { variable } = req.body;
  if (!variable) return res.status(400).json({ error: "No variable provided" });

  // Capitalize first letter, decapitalize the rest
  const formattedVariable =
    variable.charAt(0).toUpperCase() + variable.slice(1).toLowerCase();

  // Call OpenAI API (replace with your key and endpoint)
  try {
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are an assistant that only responds with a single emoji.",
            },
            {
              role: "user",
              content: `Suggest a single emoji that best represents the variable \"${formattedVariable}\" for a self-tracking app. Only return the emoji.`,
            },
          ],
          max_tokens: 5,
          temperature: 0.7,
        }),
      }
    );
    const data = await openaiRes.json();
    console.log("GPT response:", JSON.stringify(data, null, 2)); // Improved debug log
    const emoji = data.choices?.[0]?.message?.content?.trim() || "🆕";
    res.status(200).json({ emoji });
  } catch (e) {
    res.status(500).json({ emoji: "🆕" });
  }
}
