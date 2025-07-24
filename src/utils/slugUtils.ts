/**
 * Utility functions for creating slugs from variable names
 */

/**
 * Creates a slug from a variable name
 * - Converts to lowercase
 * - Replaces spaces with underscores
 * - Removes or replaces special characters that might cause issues in URLs/databases
 * - Ensures the slug is URL-safe
 */
export function createVariableSlug(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .toLowerCase()
    .trim()
    // Replace spaces with underscores (as requested)
    .replace(/\s+/g, '_')
    // Replace other potentially problematic characters
    .replace(/[^\w\-_]/g, '') // Keep only word characters, hyphens, and underscores
    // Remove multiple consecutive underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Ensure it's not empty
    .replace(/^$/, 'variable');
}

/**
 * Creates a more permissive slug that preserves more characters
 * - Converts to lowercase
 * - Replaces spaces with underscores
 * - Keeps most printable characters but makes them URL-safe
 */
export function createPermissiveSlug(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .toLowerCase()
    .trim()
    // Replace spaces with underscores (as requested)
    .replace(/\s+/g, '_')
    // Replace characters that are problematic in URLs with safe alternatives
    .replace(/[<>:"\\|?*]/g, '') // Remove Windows filename invalid characters
    .replace(/[&]/g, 'and') // Replace & with 'and'
    .replace(/[+]/g, 'plus') // Replace + with 'plus'
    .replace(/[=]/g, 'equals') // Replace = with 'equals'
    .replace(/[#]/g, 'hash') // Replace # with 'hash'
    .replace(/[@]/g, 'at') // Replace @ with 'at'
    .replace(/[%]/g, 'percent') // Replace % with 'percent'
    .replace(/[!]/g, 'exclamation') // Replace ! with 'exclamation'
    .replace(/[?]/g, 'question') // Replace ? with 'question'
    .replace(/[.]/g, 'dot') // Replace . with 'dot'
    .replace(/[,]/g, 'comma') // Replace , with 'comma'
    .replace(/[;]/g, 'semicolon') // Replace ; with 'semicolon'
    .replace(/[:]/g, 'colon') // Replace : with 'colon'
    .replace(/[']/g, 'apostrophe') // Replace ' with 'apostrophe'
    .replace(/["]/g, 'quote') // Replace " with 'quote'
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/[\[\]]/g, '') // Remove brackets
    .replace(/[{}]/g, '') // Remove braces
    .replace(/[\/\\]/g, 'slash') // Replace / and \ with 'slash'
    // Remove multiple consecutive underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Ensure it's not empty
    .replace(/^$/, 'variable');
}

/**
 * Validates if a slug is valid for database use
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Check length
  if (slug.length < 1 || slug.length > 100) {
    return false;
  }

  // Check if it contains only valid characters
  if (!/^[a-z0-9_-]+$/.test(slug)) {
    return false;
  }

  // Check if it doesn't start or end with underscore
  if (slug.startsWith('_') || slug.endsWith('_')) {
    return false;
  }

  return true;
} 