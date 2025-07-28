// Standard variable categories for the Modular Health application
export const VARIABLE_CATEGORIES = [
  'Exercise',
  'Sleep', 
  'Nutrition',
  'Mental Health',
  'Productivity',
  'Environment',
  'Social',
  'Other'
] as const;

export type VariableCategory = typeof VARIABLE_CATEGORIES[number];

// Category metadata with descriptions and icons
export const CATEGORY_METADATA: Record<VariableCategory, { 
  description: string; 
  icon: string; 
  color: string; 
}> = {
  'Exercise': {
    description: 'Physical activity, fitness, and body measurements',
    icon: '🏃',
    color: '#FF5722'
  },
  'Sleep': {
    description: 'Sleep quality, duration, and recovery metrics',
    icon: '😴',
    color: '#3F51B5'
  },
  'Nutrition': {
    description: 'Food intake, supplements, and dietary habits',
    icon: '🍎',
    color: '#4CAF50'
  },
  'Mental Health': {
    description: 'Mood, stress, anxiety, and emotional wellbeing',
    icon: '🧠',
    color: '#9C27B0'
  },
  'Productivity': {
    description: 'Work efficiency, focus, and goal achievement',
    icon: '📈',
    color: '#FF9800'
  },
  'Environment': {
    description: 'External factors like temperature, light, and noise',
    icon: '🌡️',
    color: '#795548'
  },
  'Social': {
    description: 'Social interactions, relationships, and connections',
    icon: '👥',
    color: '#E91E63'
  },
  'Other': {
    description: 'Miscellaneous variables that don\'t fit other categories',
    icon: '📊',
    color: '#607D8B'
  }
};

// Helper function to get category metadata
export const getCategoryMetadata = (category: string) => {
  return CATEGORY_METADATA[category as VariableCategory] || CATEGORY_METADATA['Other'];
};

// Helper function to validate category
export const isValidCategory = (category: string): category is VariableCategory => {
  return VARIABLE_CATEGORIES.includes(category as VariableCategory);
}; 