import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Container, 
  Typography, 
  Alert, 
  Box, 
  Button,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { FaArrowLeft } from 'react-icons/fa';
import MergedVariableDisplay from '@/components/MergedVariableDisplay';
import { useUser } from '../_app';

interface MergeConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  canonical_unit: string;
  primary_source: string;
  enable_correlation_analysis: boolean;
  variables: Array<{
    variable_id: string;
    variable_label: string;
    variable_slug: string;
    data_source: string;
    source_priority: number;
    accuracy_percentage: number;
    source_unit: string;
  }>;
  created_at: string;
  created_by: string;
}

export default function MergedVariablePage() {
  const router = useRouter();
  const { slug } = router.query;
  const { user } = useUser();
  const [mergeConfig, setMergeConfig] = useState<MergeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof slug === 'string') {
      loadMergeConfig(slug);
    }
  }, [slug]);

  const loadMergeConfig = (configSlug: string) => {
    try {
      // Load from localStorage (in production, this would be from database)
      const existingMerges = JSON.parse(localStorage.getItem('variable_merges') || '[]');
      const config = existingMerges.find((merge: MergeConfig) => merge.slug === configSlug);
      
      if (config) {
        setMergeConfig(config);
      } else {
        // Try the hardcoded body_weight example
        if (configSlug === 'body_weight') {
          setMergeConfig({
            id: 'body_weight_demo',
            name: 'Body Weight (All Sources)',
            slug: 'body_weight',
            description: 'Merged view of weight data from multiple sources',
            canonical_unit: 'kg',
            primary_source: 'withings',
            enable_correlation_analysis: true,
            variables: [
              {
                variable_id: 'e722b859-7c3f-494f-8ebf-4db24914803a',
                variable_label: 'Weight',
                variable_slug: 'weight',
                data_source: 'manual',
                source_priority: 1,
                accuracy_percentage: 90,
                source_unit: 'kg'
              },
              {
                variable_id: '4db5c85b-0f41-4eb9-81de-3b57b5dfa198',
                variable_label: 'Weight (Apple Health)',
                variable_slug: 'apple_health_weight',
                data_source: 'apple_health',
                source_priority: 2,
                accuracy_percentage: 95,
                source_unit: 'kg'
              }
            ],
            created_at: new Date().toISOString(),
            created_by: 'system'
          });
        } else {
          setError(`Merged variable configuration "${configSlug}" not found.`);
        }
      }
    } catch (error) {
      console.error('Error loading merge config:', error);
      setError('Failed to load merge configuration.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Loading merged variable...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<FaArrowLeft />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Alert severity="error">
          {error}
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            Available merged variables:
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => router.push('/merged-variable/body_weight')}
            sx={{ mt: 1 }}
          >
            Try Body Weight Demo
          </Button>
        </Box>
      </Container>
    );
  }

  if (!mergeConfig) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Merge configuration not found.
        </Alert>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Please sign in to view merged variables.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<FaArrowLeft />}
          onClick={() => router.back()}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h4" gutterBottom>
                  {mergeConfig.name}
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                  {mergeConfig.description}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${mergeConfig.variables.length} sources`} 
                    size="small" 
                    color="primary"
                  />
                  <Chip 
                    label={`Unit: ${mergeConfig.canonical_unit}`} 
                    size="small" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`Primary: ${mergeConfig.primary_source}`} 
                    size="small" 
                    variant="outlined"
                  />
                  {mergeConfig.enable_correlation_analysis && (
                    <Chip 
                      label="Correlation enabled" 
                      size="small" 
                      color="success"
                    />
                  )}
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Data Sources
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {mergeConfig.variables.map((variable) => (
                  <Chip
                    key={variable.variable_id}
                    label={`${variable.variable_label} (${variable.data_source})`}
                    size="small"
                    sx={{
                      bgcolor: variable.data_source === 'withings' ? '#00BCD4' :
                               variable.data_source === 'apple_health' ? '#FF9800' :
                               variable.data_source === 'manual' ? '#4CAF50' :
                               variable.data_source === 'oura' ? '#9C27B0' : '#757575',
                      color: 'white'
                    }}
                  />
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Merged Variable Display */}
      <MergedVariableDisplay 
        mergeGroupSlug={mergeConfig.slug}
        userId={user.id}
        onConfigChange={(config) => {
          console.log('Merge configuration changed:', config);
        }}
      />
    </Container>
  );
} 