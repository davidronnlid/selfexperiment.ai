
// Apple Health Variable Mapping for fixing data fetch
const APPLE_HEALTH_VARIABLE_MAPPING = {
  'steps': {
    variable_id: 'bb4b56d6-02f3-47fe-97fe-b1f1b44e6017',
    slug: 'steps',
    label: 'Steps'
  },
  'heart_rate': {
    variable_id: '89a8bf8c-2b64-4967-8600-d1e2c63670fb',
    slug: 'apple_health_heart_rate',
    label: 'Heart Rate (Apple Health)'
  },
  'weight': {
    variable_id: '4db5c85b-0f41-4eb9-81de-3b57b5dfa198',
    slug: 'apple_health_weight',
    label: 'Weight (Apple Health)'
  }
};

// Function to get Apple Health string ID from UUID
function getAppleHealthStringId(variableUuid) {
  for (const [stringId, mapping] of Object.entries(APPLE_HEALTH_VARIABLE_MAPPING)) {
    if (mapping.variable_id === variableUuid) {
      return stringId;
    }
  }
  return null;
}

module.exports = { APPLE_HEALTH_VARIABLE_MAPPING, getAppleHealthStringId };
