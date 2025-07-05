// Enhanced Variable Creator Component

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { FaExpandArrowsAlt, FaPlus, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { 
  Variable, 
  VariableFormData, 
  Unit, 
  UnitGroup,
  VARIABLE_TYPES,
  VARIABLE_METHODS,
  VARIABLE_CATEGORIES,
  createVariableSlug 
} from '@/types/variables';
import { getAllUnits, getAllUnitGroups, createVariable, updateVariable } from '@/utils/variablesV2';
import { useUser } from '@/pages/_app';

interface VariableCreatorProps {
  open: boolean;
  onClose: () => void;
  onVariableCreated: (variable: Variable) => void;
  editingVariable?: Variable | null;
}

export default function VariableCreator({
  open,
  onClose,
  onVariableCreated,
  editingVariable
}: VariableCreatorProps) {
  const { user } = useUser();
  const [formData, setFormData] = useState<VariableFormData>({
    label: '',
    slug: '',
    type: 'continuous',
    method: 'manual_entry',
    description: '',
    icon: '',
    category: '',
    decimal_places: 2
  });
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitGroups, setUnitGroups] = useState<UnitGroup[]>([]);
  const [categoricalOptions, setCategoricalOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');
  const [ordinalLabels, setOrdinalLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadUnitsData();
  }, []);

  useEffect(() => {
    if (editingVariable) {
      setFormData({
        label: editingVariable.label,
        slug: editingVariable.slug,
        type: editingVariable.type,
        unit: editingVariable.unit || '',
        method: editingVariable.method,
        description: editingVariable.description || '',
        icon: editingVariable.icon || '',
        category: editingVariable.category || '',
        categorical_options: editingVariable.categorical_options || [],
        min_value: editingVariable.min_value,
        max_value: editingVariable.max_value,
        decimal_places: editingVariable.decimal_places,
        ordinal_min: editingVariable.ordinal_min,
        ordinal_max: editingVariable.ordinal_max,
        ordinal_labels: editingVariable.ordinal_labels || []
      });
      setCategoricalOptions(editingVariable.categorical_options || []);
      setOrdinalLabels(editingVariable.ordinal_labels || []);
    } else {
      resetForm();
    }
  }, [editingVariable]);

  useEffect(() => {
    // Auto-generate slug from label
    if (formData.label && !editingVariable) {
      setFormData(prev => ({
        ...prev,
        slug: createVariableSlug(formData.label)
      }));
    }
  }, [formData.label, editingVariable]);

  const loadUnitsData = async () => {
    try {
      const [unitsData, unitGroupsData] = await Promise.all([
        getAllUnits(),
        getAllUnitGroups()
      ]);
      setUnits(unitsData);
      setUnitGroups(unitGroupsData);
    } catch (err) {
      setError('Failed to load units data');
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      slug: '',
      type: 'continuous',
      method: 'manual_entry',
      description: '',
      icon: '',
      category: '',
      decimal_places: 2
    });
    setCategoricalOptions([]);
    setOrdinalLabels([]);
    setNewOption('');
    setNewLabel('');
    setError('');
  };

  const handleInputChange = (field: keyof VariableFormData, value: any) => {
    setFormData((prev: VariableFormData) => ({ ...prev, [field]: value }));
  };

  const addCategoricalOption = () => {
    if (newOption.trim() && !categoricalOptions.includes(newOption.trim())) {
      setCategoricalOptions((prev: string[]) => [...prev, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeCategoricalOption = (option: string) => {
    setCategoricalOptions((prev: string[]) => prev.filter((opt: string) => opt !== option));
  };

  const addOrdinalLabel = () => {
    if (newLabel.trim()) {
      setOrdinalLabels((prev: string[]) => [...prev, newLabel.trim()]);
      setNewLabel('');
    }
  };

  const removeOrdinalLabel = (index: number) => {
    setOrdinalLabels((prev: string[]) => prev.filter((_: string, i: number) => i !== index));
  };

  const getUnitsForSelectedGroup = () => {
    if (!formData.unit) return [];
    const unitGroup = unitGroups.find((ug: UnitGroup) => ug.name === getUnitGroupForUnit(formData.unit));
    if (!unitGroup) return [];
    return units.filter((u: Unit) => u.unit_group_id === unitGroup.id);
  };

  const getUnitGroupForUnit = (unitCode: string): string => {
    const unit = units.find((u: Unit) => u.code === unitCode);
    if (!unit) return '';
    const unitGroup = unitGroups.find((ug: UnitGroup) => ug.id === unit.unit_group_id);
    return unitGroup?.name || '';
  };

  const validateForm = (): string => {
    if (!formData.label.trim()) return 'Label is required';
    if (!formData.slug.trim()) return 'Slug is required';
    if (!formData.type) return 'Type is required';
    if (!formData.method) return 'Method is required';

    if (formData.type === 'categorical' && categoricalOptions.length === 0) {
      return 'Categorical variables must have at least one option';
    }

    if (formData.type === 'continuous') {
      if (formData.min_value !== undefined && formData.max_value !== undefined) {
        if (formData.min_value >= formData.max_value) {
          return 'Maximum value must be greater than minimum value';
        }
      }
    }

    if (formData.type === 'ordinal') {
      if (formData.ordinal_min !== undefined && formData.ordinal_max !== undefined) {
        if (formData.ordinal_min >= formData.ordinal_max) {
          return 'Maximum ordinal value must be greater than minimum';
        }
      }
    }

    return '';
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const variableData: VariableFormData = {
        ...formData,
        categorical_options: formData.type === 'categorical' ? categoricalOptions : undefined,
        ordinal_labels: formData.type === 'ordinal' ? ordinalLabels : undefined
      };

      let variable: Variable;
      if (editingVariable) {
        variable = await updateVariable(editingVariable.id, variableData);
      } else {
        variable = await createVariable(variableData, user?.id);
      }

      onVariableCreated(variable);
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save variable');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'continuous':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Continuous Variable Settings
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                type="number"
                label="Minimum Value"
                value={formData.min_value || ''}
                onChange={(e) => handleInputChange('min_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                fullWidth
              />
              <TextField
                type="number"
                label="Maximum Value"
                value={formData.max_value || ''}
                onChange={(e) => handleInputChange('max_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                fullWidth
              />
            </Box>

            <TextField
              type="number"
              label="Decimal Places"
              value={formData.decimal_places || 2}
              onChange={(e) => handleInputChange('decimal_places', parseInt(e.target.value))}
              fullWidth
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth>
              <InputLabel>Unit</InputLabel>
              <Select
                value={formData.unit || ''}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                label="Unit"
              >
                <MenuItem value="">No Unit</MenuItem>
                                 {units.map((unit: Unit) => (
                  <MenuItem key={unit.id} value={unit.code}>
                    {unit.name} ({unit.symbol})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );

      case 'ordinal':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Ordinal Variable Settings
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                type="number"
                label="Minimum Value"
                value={formData.ordinal_min || ''}
                onChange={(e) => handleInputChange('ordinal_min', e.target.value ? parseInt(e.target.value) : undefined)}
                fullWidth
              />
              <TextField
                type="number"
                label="Maximum Value"
                value={formData.ordinal_max || ''}
                onChange={(e) => handleInputChange('ordinal_max', e.target.value ? parseInt(e.target.value) : undefined)}
                fullWidth
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Ordinal Labels (Optional)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label="Add label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && addOrdinalLabel()}
                  size="small"
                  fullWidth
                />
                <Button onClick={addOrdinalLabel} variant="outlined" size="small">
                  <FaPlus />
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {ordinalLabels.map((label, index) => (
                  <Chip
                    key={index}
                    label={`${index + 1}: ${label}`}
                    onDelete={() => removeOrdinalLabel(index)}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          </Box>
        );

      case 'categorical':
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Categorical Variable Settings
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label="Add option"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCategoricalOption()}
                size="small"
                fullWidth
              />
              <Button onClick={addCategoricalOption} variant="outlined" size="small">
                <FaPlus />
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {categoricalOptions.map(option => (
                <Chip
                  key={option}
                  label={option}
                  onDelete={() => removeCategoricalOption(option)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingVariable ? 'Edit Variable' : 'Create New Variable'}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Basic Information */}
          <Typography variant="h6">Basic Information</Typography>
          
          <TextField
            label="Label"
            value={formData.label}
            onChange={(e) => handleInputChange('label', e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Slug (Internal ID)"
            value={formData.slug}
            onChange={(e) => handleInputChange('slug', e.target.value)}
            fullWidth
            required
            helperText="Used internally to identify this variable"
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Icon (Emoji)"
              value={formData.icon}
              onChange={(e) => handleInputChange('icon', e.target.value)}
              sx={{ width: '150px' }}
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                label="Category"
              >
                {VARIABLE_CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Variable Type and Method */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                label="Type"
              >
                {VARIABLE_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Method</InputLabel>
              <Select
                value={formData.method}
                onChange={(e) => handleInputChange('method', e.target.value)}
                label="Method"
              >
                {VARIABLE_METHODS.map(method => (
                  <MenuItem key={method} value={method}>
                    {method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Type-specific settings */}
          {renderTypeSpecificFields()}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving...' : (editingVariable ? 'Update' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}