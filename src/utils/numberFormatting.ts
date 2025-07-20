/**
 * Formats large numbers with K notation (1000+ becomes 1K, 1.5K, etc.)
 * and M notation (1000000+ becomes 1M, 1.5M, etc.)
 */
export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}; 