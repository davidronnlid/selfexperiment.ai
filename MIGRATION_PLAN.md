# Migration Plan: LOG_LABELS → Enhanced Variables System

## 🎯 Overview

This document outlines the step-by-step migration from the current LOG_LABELS system to the new enhanced variables system with unit conversion support. The migration is designed to be **gradual**, **safe**, and **backward-compatible** during the transition period.

## 📅 Migration Timeline

### Phase 1: Foundation (Week 1-2)
**Goal**: Deploy new system alongside existing system

- ✅ Deploy database schema
- ✅ Deploy new TypeScript types and utilities
- ✅ Deploy new React components
- ✅ Migrate existing variables to new format
- ⚠️ Keep both systems running in parallel

### Phase 2: Gradual Adoption (Week 3-4)
**Goal**: Start using new system for new features

- 🔄 Update new logging forms to use enhanced inputs
- 🔄 Add unit conversion features
- 🔄 Implement user preference management
- ⚠️ Existing data continues using old system

### Phase 3: Full Migration (Week 5-6)
**Goal**: Migrate all existing functionality

- 🔄 Update analytics to use new data structure
- 🔄 Update privacy settings to use new variables
- 🔄 Update all forms and input components
- ⚠️ Old system remains available for fallback

### Phase 4: Cleanup (Week 7-8)
**Goal**: Remove old system and optimize

- 🗑️ Remove LOG_LABELS dependencies
- 🗑️ Archive old daily_logs table
- 🚀 Performance optimization
- 📚 Documentation updates

## 🔄 Technical Migration Steps

### Step 1: Database Migration

```bash
# Run the migration script
chmod +x scripts/migrate_database.sh
./scripts/migrate_database.sh

# Verify migration
./scripts/migrate_database.sh verify
```

**What this does:**
- Creates new tables: `variables`, `units`, `unit_groups`, `user_variables`, `user_unit_preferences`
- Migrates existing LOG_LABELS to structured variables
- Preserves all existing `daily_logs` data
- Creates new `daily_logs_v2` with enhanced structure

### Step 2: Code Migration Map

| Old System | New System | Status |
|------------|------------|--------|
| `LOG_LABELS` array | `variables` table | ✅ Auto-migrated |
| `ValidatedInput` | `EnhancedVariableInput` | ✅ Implemented |
| `DropdownInput` | `EnhancedVariableInput` (categorical) | ✅ Implemented |
| `validateValue()` | `validateVariableValue()` | ✅ Enhanced |
| `getInputProps()` | Built into components | ✅ Improved |
| Hard-coded labels | Dynamic variable management | ✅ Flexible |

### Step 3: Component Migration

#### 3.1 Input Components

**Before (LOG_LABELS):**
```tsx
import ValidatedInput from '@/components/ValidatedInput';
import { LOG_LABELS } from '@/utils/logLabels';

<ValidatedInput
  label="Mood"
  value={mood}
  onChange={setMood}
  showValidation={true}
/>
```

**After (Enhanced Variables):**
```tsx
import EnhancedVariableInput from '@/components/EnhancedVariableInput';
import { getVariableBySlug } from '@/utils/variablesV2';

const moodVariable = await getVariableBySlug('mood');

<EnhancedVariableInput
  variable={moodVariable}
  value={mood}
  onChange={setMood}
  showUnitConverter={true}
/>
```

#### 3.2 Form Updates

**Migration Strategy:**
1. **Parallel Forms**: Create new forms using enhanced components
2. **Feature Flags**: Use environment variables to control which system to use
3. **Gradual Rollout**: Update components one by one
4. **A/B Testing**: Compare user experience between systems

### Step 4: Data Logging Migration

#### 4.1 New Logging API

**Before:**
```typescript
// Old logging
await supabase.from('daily_logs').insert({
  user_id: userId,
  label: 'Weight',
  value: '70',
  date: new Date().toISOString().split('T')[0]
});
```

**After:**
```typescript
// New logging with unit conversion
await logVariableValue(
  userId,
  weightVariable.id,
  70,              // value
  'kg',            // unit
  new Date(),      // date
  'manual_entry'   // method
);
// Automatically converts to canonical units for storage
```

#### 4.2 Data Reading Migration

**Before:**
```typescript
// Old data reading
const logs = await supabase
  .from('daily_logs')
  .select('*')
  .eq('user_id', userId)
  .eq('label', 'Weight');
```

**After:**
```typescript
// New data reading with unit conversion
const logs = await getUserLogEntries(
  userId,
  weightVariable.id,
  startDate,
  endDate
);
// Automatically converts to user's preferred units
```

### Step 5: Analytics Migration

#### 5.1 Chart Data Processing

**Before:**
```typescript
// Manual unit handling in charts
const processChartData = (logs: any[]) => {
  return logs.map(log => ({
    date: log.date,
    value: parseFloat(log.value)
    // No unit conversion
  }));
};
```

**After:**
```typescript
// Automatic unit conversion for charts
const processChartData = (logs: LogEntryWithDetails[]) => {
  return logs.map(log => ({
    date: log.date,
    value: parseFloat(log.display_value),
    unit: log.display_unit
    // Already converted to user's preferred unit
  }));
};
```

## 🧪 Testing Strategy

### Automated Testing

```bash
# Run test suite
npm test src/test/variables.test.ts

# Performance testing
npm run test:performance

# Integration testing
npm run test:integration
```

### Manual Testing Checklist

#### Core Functionality
- [ ] Variable creation with different types
- [ ] Unit conversion accuracy
- [ ] User preference persistence
- [ ] Data validation for all variable types
- [ ] Form submission and data storage

#### User Experience
- [ ] Input components render correctly
- [ ] Unit selector works smoothly
- [ ] Validation messages are helpful
- [ ] Performance is acceptable
- [ ] Mobile responsiveness

#### Data Migration
- [ ] All existing variables migrated correctly
- [ ] Historical data preserved
- [ ] Unit conversions accurate
- [ ] No data loss during migration
- [ ] Rollback capability works

## 🚨 Risk Management

### High-Risk Areas

1. **Data Loss** - Mitigated by automatic backups
2. **Performance** - Mitigated by optimized indexes
3. **User Confusion** - Mitigated by gradual rollout
4. **Unit Conversion Errors** - Mitigated by comprehensive testing

### Rollback Strategy

```bash
# If issues arise, rollback using backup
./scripts/migrate_database.sh rollback

# Or restore from specific backup
psql -d selfexperiment < backup_20241201_120000.sql
```

### Monitoring Plan

**Key Metrics to Watch:**
- Database query performance
- API response times
- User engagement with new features
- Error rates and validation failures
- Unit conversion accuracy

**Alerts Setup:**
```typescript
// Example monitoring
const metrics = {
  conversionErrors: 0,
  validationFailures: 0,
  performanceSlowdowns: 0
};

// Alert if error rate > 1%
if (metrics.conversionErrors / totalConversions > 0.01) {
  sendAlert('Unit conversion error rate high');
}
```

## 📋 Migration Checklist

### Pre-Migration
- [ ] Database backup created
- [ ] Test environment validated
- [ ] Team trained on new system
- [ ] Rollback plan tested
- [ ] Performance benchmarks established

### During Migration
- [ ] Schema migration executed successfully
- [ ] Data migration completed
- [ ] New tables populated
- [ ] Indexes created
- [ ] RLS policies applied

### Post-Migration
- [ ] All tests passing
- [ ] Performance within acceptable range
- [ ] User testing completed
- [ ] Documentation updated
- [ ] Team training completed

### Component Migration Progress

| Component | Status | Notes |
|-----------|--------|-------|
| Log Forms | 🔄 In Progress | Using EnhancedVariableInput |
| Analytics Charts | ⏳ Planned | Need unit-aware processing |
| Privacy Settings | ⏳ Planned | Update to new variable IDs |
| Profile Settings | ⏳ Planned | Add unit preferences |
| Mobile App | ⏳ Future | Sync with enhanced API |

## 🎯 Success Criteria

### Technical Success
- ✅ Zero data loss during migration
- ✅ Performance within 10% of baseline
- ✅ All automated tests passing
- ✅ Unit conversion accuracy > 99.9%

### User Experience Success
- ✅ User satisfaction scores maintained
- ✅ Feature adoption > 80% within 4 weeks
- ✅ Support ticket volume < 5% increase
- ✅ No critical bugs in first 2 weeks

### Business Success
- ✅ Enable advanced analytics features
- ✅ Support community data sharing
- ✅ Prepare for multi-device sync
- ✅ Improve data quality and consistency

## 🔧 Development Guidelines

### During Transition Period

```typescript
// Use feature flags for gradual rollout
const useEnhancedVariables = process.env.NEXT_PUBLIC_ENHANCED_VARIABLES === 'true';

if (useEnhancedVariables) {
  // Use new system
  return <EnhancedVariableInput variable={variable} />;
} else {
  // Use old system
  return <ValidatedInput label={label} />;
}
```

### Code Review Guidelines

1. **New Code**: Must use enhanced variables system
2. **Existing Code**: Can be migrated incrementally
3. **Critical Paths**: Migrate with extra testing
4. **Performance**: Monitor query performance
5. **Types**: Use TypeScript strictly

### Documentation Requirements

- [ ] Update API documentation
- [ ] Update component documentation
- [ ] Create migration guides for team
- [ ] Update README files
- [ ] Create troubleshooting guides

## 📞 Support & Escalation

### Support Contacts
- **Technical Issues**: Development team
- **Database Issues**: DevOps team
- **User Issues**: Product team
- **Performance Issues**: Infrastructure team

### Escalation Matrix
1. **Minor Issues**: Fix in next sprint
2. **Major Issues**: Fix within 24 hours
3. **Critical Issues**: Immediate rollback consideration
4. **Data Loss**: Immediate escalation to leadership

## 🚀 Post-Migration Optimization

### Phase 1 Optimizations (Week 9-10)
- Query performance tuning
- Index optimization
- Cache implementation
- API response optimization

### Phase 2 Enhancements (Week 11-12)
- Advanced unit conversion features
- Bulk data operations
- Enhanced analytics
- Mobile app integration

### Future Roadmap
- Machine learning for data insights
- Advanced correlation analysis
- Community data sharing features
- Integration with additional devices

---

**Note**: This migration plan is designed to be executed gradually and safely. Each phase can be adjusted based on feedback and observed performance. The key is maintaining system stability while introducing powerful new capabilities.