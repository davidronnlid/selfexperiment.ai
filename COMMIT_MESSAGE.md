feat: implement enhanced variables system with comprehensive unit conversion

## 🎯 Overview
Complete overhaul of the variables system to support standardized units, 
convertibility, measurement methods, and advanced validation. This enables 
data consistency, interoperability, and prepares the system for advanced 
analytics and user data sharing.

## ✨ New Features

### Database Schema
- **Enhanced Variables Table**: Complete metadata with units, validation rules, and constraints
- **Unit Conversion System**: 8 unit groups, 30+ predefined units with conversion factors
- **User Preferences**: Custom unit preferences and variable customizations
- **Advanced Logging**: Enhanced daily_logs_v2 with canonical value storage
- **Security**: Complete RLS policies and optimized indexing

### TypeScript Infrastructure
- **15+ Interfaces**: Comprehensive type system for variables, units, and preferences
- **Type Guards**: Runtime type checking and validation functions
- **Utility Functions**: Helper functions for variable management and display
- **Constants**: Predefined types, methods, and categories

### Unit Conversion Engine
- **Universal Converter**: Handles all unit types including non-linear temperature conversion
- **Canonical Storage**: Automatic conversion to base units for consistent analysis
- **Smart Display**: Auto-detection of optimal display units for readability
- **User Preferences**: Automatic conversion to user's preferred units

### Enhanced Components
- **VariableCreator**: Complete CRUD interface for variable management
- **EnhancedVariableInput**: Smart input components with real-time unit conversion
- **Type-Specific UIs**: Sliders for ordinals, toggles for categories, switches for booleans

## 🔧 Technical Implementation

### Files Added
```
database/variables_schema.sql       - Complete database schema with 5 new tables
src/types/variables.ts             - TypeScript interfaces and type definitions
src/utils/unitConversion.ts        - Unit conversion utilities and algorithms
src/utils/variablesV2.ts          - Variables management and CRUD operations
src/components/VariableCreator.tsx - Variable creation/editing interface
src/components/EnhancedVariableInput.tsx - Smart input with unit conversion
API_DOCUMENTATION.md               - Comprehensive API documentation
```

### Database Changes
- **5 New Tables**: variables, units, unit_groups, user_variables, user_unit_preferences
- **Pre-populated Data**: 8 unit groups, 30+ units, 25+ migrated variables
- **Performance**: Optimized indexes for fast queries
- **Security**: Row-level security policies for all tables

### API Enhancements
- **CRUD Operations**: Complete variable management endpoints
- **Unit Management**: Unit and unit group management functions
- **User Preferences**: Personal customization and preference storage
- **Advanced Validation**: Type-specific validation with detailed error messages

## 🚀 Benefits

### For Users
- **Automatic Unit Conversion**: Enter in any unit, display in preferred unit
- **Smart Input Validation**: Real-time validation with helpful error messages
- **Personalized Experience**: Remember preferred units and variable customizations
- **Better UX**: Type-appropriate input components (sliders, toggles, autocomplete)

### For Developers
- **Type Safety**: Complete TypeScript coverage for all operations
- **Extensibility**: Easy to add new variables, units, and measurement methods
- **Consistency**: Standardized data storage and retrieval patterns
- **Analytics Ready**: Canonical value storage for correlation analysis

### For Data Analysis
- **Consistent Units**: All data stored in canonical units for accurate analysis
- **Rich Metadata**: Variable types, constraints, and validation rules
- **User Context**: Track measurement methods and confidence levels
- **Interoperability**: Standardized format for data export and sharing

## 🔄 Migration Strategy
- **Backward Compatibility**: Existing LOG_LABELS system remains functional
- **Migration Helpers**: Automatic conversion from old to new format
- **Gradual Rollout**: Can be deployed incrementally without breaking changes
- **Data Preservation**: All existing log data can be migrated to new format

## 🧪 Testing Considerations
- Unit conversion accuracy across all unit types
- Variable validation for all data types
- User preference persistence and application
- Performance with large datasets
- Cross-browser compatibility for enhanced components

## 📚 Documentation
- Complete API documentation with usage examples
- TypeScript interfaces with comprehensive JSDoc comments
- Database schema documentation with relationship diagrams
- Component usage examples and integration patterns

## 🎯 Next Steps
1. Run database migration script
2. Update environment variables if needed
3. Test core functionality in development
4. Plan gradual migration from LOG_LABELS system
5. Monitor performance after deployment

## 🔗 Related Issues
- Addresses data consistency requirements
- Enables advanced analytics features
- Prepares for community data sharing
- Supports multi-device data synchronization

## ⚠️ Breaking Changes
None - this is additive functionality that maintains backward compatibility
with the existing LOG_LABELS system during transition period.

Co-authored-by: AI Assistant <ai@selfexperiment.ai>