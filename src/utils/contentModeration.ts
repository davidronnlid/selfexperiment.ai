// Content Moderation Utilities
// Provides basic automated checks while preserving free speech

interface ModerationResult {
  isAllowed: boolean;
  reason?: string;
  severity?: "low" | "medium" | "high";
  suggestions?: string[];
}

// Basic patterns to flag (not block) potentially problematic content
const FLAGGED_PATTERNS = [
  // Spam indicators
  /(.)\1{10,}/i, // Repeated characters (10+ times)
  /https?:\/\/[^\s]+/gi, // URLs
  /\b(buy|sell|discount|offer|deal)\b.*\b(now|today|limited)\b/i, // Commercial spam

  // Potentially misleading medical claims
  /\b(cure|cures|miracle|guaranteed|instant)\b.*\b(cancer|diabetes|depression|anxiety)\b/i,

  // Excessive profanity (not blocking mild profanity)
  /\b(f\*{3,}|s\*{3,})\b/i, // Only excessive censored profanity
];

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if content should be flagged for review (not blocked)
 */
export function moderateContent(content: string): ModerationResult {
  if (!content || content.trim().length === 0) {
    return { isAllowed: true };
  }

  // Check for spam patterns
  for (const pattern of FLAGGED_PATTERNS) {
    if (pattern.test(content)) {
      return {
        isAllowed: true, // Allow but flag
        reason: "Content flagged for review",
        severity: "low",
        suggestions: ["Consider using more descriptive language"],
      };
    }
  }

  // Check for excessive length (potential spam)
  if (content.length > 500) {
    return {
      isAllowed: true,
      reason: "Unusually long content",
      severity: "low",
      suggestions: ["Consider shortening the description"],
    };
  }

  return { isAllowed: true };
}

/**
 * Check rate limiting for variable creation
 */
export function checkRateLimit(
  userId: string,
  maxPerHour: number = 10
): ModerationResult {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitStore.set(userId, { count: 1, resetTime: now + hourMs });
    return { isAllowed: true };
  }

  if (userLimit.count >= maxPerHour) {
    return {
      isAllowed: false,
      reason: `Rate limit exceeded. Maximum ${maxPerHour} variables per hour.`,
      severity: "medium",
    };
  }

  userLimit.count++;
  return { isAllowed: true };
}

/**
 * Validate variable name for basic requirements
 */
export function validateVariableName(name: string): ModerationResult {
  if (!name || name.trim().length === 0) {
    return {
      isAllowed: false,
      reason: "Variable name is required",
      severity: "high",
    };
  }

  if (name.length > 100) {
    return {
      isAllowed: false,
      reason: "Variable name too long (max 100 characters)",
      severity: "medium",
    };
  }

  if (name.length < 2) {
    return {
      isAllowed: false,
      reason: "Variable name too short (min 2 characters)",
      severity: "medium",
    };
  }

  // Allow any printable characters - no character restrictions
  // The slug creation function will handle special characters appropriately

  return { isAllowed: true };
}

/**
 * Generate suggestions for improving variable names
 */
export function suggestVariableImprovements(
  name: string,
  description?: string
): string[] {
  const suggestions: string[] = [];

  if (name.length < 5) {
    suggestions.push("Consider adding more descriptive words");
  }

  if (!/[a-zA-Z]/.test(name)) {
    suggestions.push("Include some letters in the variable name");
  }

  if (!description || description.length < 10) {
    suggestions.push(
      "Add a description to help others understand this variable"
    );
  }

  return suggestions;
}

/**
 * Check if variable should be auto-approved for public sharing
 */
export function shouldAutoApprovePublic(variable: {
  label: string;
  description?: string;
  created_by: string;
}): boolean {
  // Basic checks for auto-approval
  const nameCheck = validateVariableName(variable.label);
  const contentCheck = moderateContent(
    variable.label + " " + (variable.description || "")
  );

  return nameCheck.isAllowed && contentCheck.isAllowed;
}

export default {
  moderateContent,
  checkRateLimit,
  validateVariableName,
  suggestVariableImprovements,
  shouldAutoApprovePublic,
};
