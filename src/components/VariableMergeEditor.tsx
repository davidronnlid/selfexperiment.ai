import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Autocomplete,
  TextField,
  Chip,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Save as SaveIcon,
  Merge as MergeIcon,
} from '@mui/icons-material';
import { supabase } from '@/utils/supaBase';
import { VARIABLE_CATEGORIES, getCategoryMetadata } from '@/utils/categories';

interface Variable {
  id: string;
  slug: string;
  label: string;
  source_type: string;
}

interface SelectedVariable {
  id: string;
  label: string;
  source_type: string;
}

interface VariableMergeEditorProps {
  open: boolean;
  onClose: () => void;
  currentVariable: Variable;
  onMergeCreated?: (mergeSlug: string) => void;
}

export default function VariableMergeEditor({
  open,
  onClose,
  currentVariable,
  onMergeCreated
}: VariableMergeEditorProps) {
  const [availableVariables, setAvailableVariables] = useState<Variable[]>([]);
  const [selectedVariable, setSelectedVariable] = useState<SelectedVariable | null>(null);
  const [parentChoice, setParentChoice] = useState<'current' | 'selected'>('current');
  const [loading, setLoading] = useState(false);
  const [fetchingVariables, setFetchingVariables] = useState(false);

  // Initialize state when dialog opens
  useEffect(() => {
    if (currentVariable && open) {
      setSelectedVariable(null);
      setParentChoice('current');
      setAvailableVariables([]);
      
      // Force fetch with a small delay to ensure dialog is fully rendered
      setTimeout(() => {
        fetchAvailableVariables();
      }, 100);
    }
  }, [currentVariable, open]);

  const fetchAvailableVariables = async () => {
    console.log('🔍 [MERGE DIALOG] Starting variables fetch...');
    console.log('🔍 [MERGE DIALOG] Current variable to exclude:', currentVariable);
    setFetchingVariables(true);
    
    try {
      // First try: Get all variables with minimal required columns
      console.log('📡 [MERGE DIALOG] Attempting primary query (minimal columns)...');
      console.log('📡 [MERGE DIALOG] Query: SELECT id, slug, label, source_type FROM variables ORDER BY label');
      
      const { data: allVariables, error: primaryError } = await supabase
        .from('variables')
        .select('id, slug, label, source_type')
        .order('label');

      console.log('📊 [MERGE DIALOG] Primary query result:');
      console.log('  - Data count:', allVariables?.length || 0);
      console.log('  - Error:', primaryError);
      console.log('  - First few variables:', allVariables?.slice(0, 3));

      if (primaryError) {
        console.error('❌ [MERGE DIALOG] Primary query error:', primaryError);
        throw primaryError;
      }

      // Filter out current variable in JavaScript to avoid database query issues
      const filteredVariables = (allVariables || []).filter(v => v.id !== currentVariable.id);
      
      console.log('✅ [MERGE DIALOG] Filtered variables:', {
        total: allVariables?.length || 0,
        afterFiltering: filteredVariables.length,
        currentVariableId: currentVariable.id
      });

      setAvailableVariables(filteredVariables);

      // If still no variables, try fallback without filtering
      if (filteredVariables.length === 0 && (allVariables?.length || 0) > 0) {
        console.log('⚠️ [MERGE DIALOG] All variables filtered out, using all variables as fallback');
        setAvailableVariables(allVariables || []);
      }

      // If absolutely no variables found, try simplified query
      if (!allVariables || allVariables.length === 0) {
        console.log('🔄 [MERGE DIALOG] No variables found, trying simplified query...');
        const { data: fallbackVariables, error: fallbackError } = await supabase
          .from('variables')
          .select('id, slug, label, source_type')
          .order('label');
          
        console.log('🔄 [MERGE DIALOG] Simplified query result:', { 
          count: fallbackVariables?.length || 0, 
          error: fallbackError 
        });
        
        if (fallbackError) {
          console.error('❌ [MERGE DIALOG] Simplified query error:', fallbackError);
        } else if (fallbackVariables && fallbackVariables.length > 0) {
          const filtered = fallbackVariables.filter(v => v.id !== currentVariable.id);
          console.log('✅ [MERGE DIALOG] Simplified query successful, setting variables');
          setAvailableVariables(filtered);
        }
      }
       
    } catch (error) {
      console.error('❌ [MERGE DIALOG] Exception during fetch:', error);
      
             // Last resort: try to get variables without any filters
       try {
         console.log('🆘 [MERGE DIALOG] Last resort: trying minimal query...');
         const { data: minimalVariables, error: minimalError } = await supabase
           .from('variables')
           .select('id, slug, label, source_type');
           
         if (!minimalError && minimalVariables) {
           console.log('🆘 [MERGE DIALOG] Minimal query worked:', minimalVariables.length);
           setAvailableVariables(minimalVariables.filter(v => v.id !== currentVariable.id));
         }
       } catch (minimalError) {
         console.error('🆘 [MERGE DIALOG] Even minimal query failed:', minimalError);
       }
    } finally {
      setFetchingVariables(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!selectedVariable) {
      alert('Please select a variable to merge with');
      return;
    }

    setLoading(true);
    try {
      const parentVariableId = parentChoice === 'current' ? currentVariable.id : selectedVariable.id;
      const childVariableId = parentChoice === 'current' ? selectedVariable.id : currentVariable.id;

      console.log('🔗 Starting variable grouping...');
      console.log('👑 Parent variable:', parentChoice === 'current' ? currentVariable.label : selectedVariable.label);
      console.log('👥 Child variable:', parentChoice === 'current' ? selectedVariable.label : currentVariable.label);

      // Step 1: Get parent and child variable details
      const { data: parentVarData, error: parentError } = await supabase
        .from('variables')
        .select('*')
        .eq('id', parentVariableId)
        .single();

      if (parentError) {
        console.error('Error fetching parent variable:', parentError);
        throw new Error('Failed to fetch parent variable');
      }

      const { data: childVarData, error: childError } = await supabase
        .from('variables')
        .select('*')
        .eq('id', childVariableId)
        .single();

      if (childError) {
        console.error('Error fetching child variable:', childError);
        throw new Error('Failed to fetch child variable');
      }

      // Step 2: Count data points for information (but don't move them)
      const { count } = await supabase
        .from('data_points')
        .select('*', { count: 'exact', head: true })
        .eq('variable_id', childVariableId);

      console.log(`📊 Child variable has ${count || 0} data points (keeping separate)`);

      // Step 3: Set parent_variable_id for child variable
      const { error: groupingError } = await supabase
        .from('variables')
        .update({ 
          parent_variable_id: parentVariableId,
          updated_at: new Date().toISOString()
        })
        .eq('id', childVariableId);

      if (groupingError) {
        console.error('Error creating variable group:', groupingError);
        throw new Error('Failed to create variable group');
      }

      // Step 4: Create grouping audit log
      const groupingLog = {
        timestamp: new Date().toISOString(),
        parent_variable_id: parentVariableId,
        parent_variable_label: parentVarData.label,
        child_variable: {
          id: childVarData.id,
          label: childVarData.label,
          source_type: childVarData.source_type
        },
        data_points_preserved: count || 0,
        performed_by: 'user'
      };

      const existingLogs = JSON.parse(localStorage.getItem('variable_grouping_logs') || '[]');
      existingLogs.push(groupingLog);
      localStorage.setItem('variable_grouping_logs', JSON.stringify(existingLogs));

      console.log('✅ Variable grouping completed successfully!');
      console.log('📊 Grouping summary:', groupingLog);

      alert(`Successfully grouped "${childVarData.label}" under "${parentVarData.label}"!\n\n` +
            `• ${count || 0} data points preserved in separate records\n` +
            `• Sources: ${parentVarData.source_type}, ${childVarData.source_type}\n` +
            `• All variables remain active and searchable\n` +
            `• Frontend will show unified view under /${parentVarData.slug}\n\n` +
            `The page will refresh to show updated data.`);

      // Refresh the page or navigate back
      window.location.reload();

    } catch (error) {
      console.error('❌ Grouping failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to group variables: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setLoading(false);
    }
  };

  const getSourceColor = (sourceType: string) => {
    const colors = {
      'withings': '#00BCD4',
      'apple_health': '#FF9800',
      'manual': '#4CAF50',
      'oura': '#9C27B0',
    };
    return colors[sourceType as keyof typeof colors] || '#757575';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MergeIcon />
          <Typography variant="h6">
            Group Variables Together
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>🔗 Variable Grouping</strong><br/>
            Group two variables together so they appear on the same page while keeping separate database records. 
            Choose which variable should be the parent (main) variable.
          </Alert>

          {/* Current Variable Display */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Current Variable</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={currentVariable.source_type || 'manual'}
                  size="small"
                  sx={{ 
                    backgroundColor: getSourceColor(currentVariable.source_type || 'manual'),
                    color: 'white'
                  }}
                />
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {currentVariable.label}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Variable Selection */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Variable to Group With
              </Typography>
              
              <Alert 
                severity={availableVariables.length === 0 ? "warning" : "success"} 
                sx={{ mb: 2 }}
                action={
                  <Button 
                    size="small" 
                    onClick={fetchAvailableVariables}
                    variant="outlined"
                    disabled={fetchingVariables}
                    sx={{ color: 'inherit' }}
                  >
                    {fetchingVariables ? '⏳ Loading...' : '🔄 Refresh'}
                  </Button>
                }
              >
                {fetchingVariables 
                  ? '⏳ Loading variables from database...' 
                  : availableVariables.length === 0 
                    ? '❌ No variables available - Click Refresh to reload'
                    : `✅ ${availableVariables.length} variables available`
                }
              </Alert>
              
              <Autocomplete
                options={availableVariables}
                disabled={availableVariables.length === 0 || fetchingVariables}
                getOptionLabel={(option) => option.label}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label={
                      fetchingVariables 
                        ? "Loading variables..." 
                        : availableVariables.length === 0 
                          ? "No variables available" 
                          : "Search and select variable by name"
                    }
                    helperText="Type to search by variable name, then click to select"
                  />
                )}
                onChange={(event, newValue) => {
                  if (newValue) {
                    setSelectedVariable({
                      id: newValue.id,
                      label: newValue.label,
                      source_type: newValue.source_type || 'manual'
                    });
                  } else {
                    setSelectedVariable(null);
                  }
                }}
                value={selectedVariable ? availableVariables.find(v => v.id === selectedVariable.id) || null : null}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Chip
                        label={option.source_type || 'manual'}
                        size="small"
                        sx={{ 
                          backgroundColor: getSourceColor(option.source_type || 'manual'),
                          color: 'white'
                        }}
                      />
                      <Typography variant="body2">
                        {option.label}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            </CardContent>
          </Card>

          {/* Parent Selection */}
          {selectedVariable && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ mb: 2 }}>
                    <Typography variant="h6">Choose Parent Variable</Typography>
                  </FormLabel>
                  <RadioGroup
                    value={parentChoice}
                    onChange={(e) => setParentChoice(e.target.value as 'current' | 'selected')}
                  >
                    <FormControlLabel
                      value="current"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={currentVariable.source_type || 'manual'}
                            size="small"
                            sx={{ 
                              backgroundColor: getSourceColor(currentVariable.source_type || 'manual'),
                              color: 'white'
                            }}
                          />
                          <Typography>{currentVariable.label}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            (current page variable)
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="selected"
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={selectedVariable.source_type}
                            size="small"
                            sx={{ 
                              backgroundColor: getSourceColor(selectedVariable.source_type),
                              color: 'white'
                            }}
                          />
                          <Typography>{selectedVariable.label}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            (selected variable)
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  The parent variable will be the main one shown on the page. The other variable will appear as a related/child variable.
                </Alert>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateGroup}
          disabled={loading || !selectedVariable}
          startIcon={<SaveIcon />}
          color="primary"
        >
          {loading ? 'Grouping Variables...' : 'Group Variables'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 