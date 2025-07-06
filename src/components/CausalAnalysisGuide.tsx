import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Science as ScienceIcon,
  Psychology as PsychologyIcon,
  Timeline as TimelineIcon,
  School as SchoolIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface CausalAnalysisStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface CausalAnalysisGuideProps {
  variable1: string;
  variable2: string;
  correlationStrength: 'strong' | 'moderate' | 'weak' | 'none';
  showWarning?: boolean;
}

const causalAnalysisSteps: CausalAnalysisStep[] = [
  {
    id: 'temporal',
    title: 'Temporal Precedence',
    description: 'Verify that the proposed cause occurs before the effect in time',
    icon: <TimelineIcon />,
    examples: [
      'Check if changes in Variable 1 consistently happen before changes in Variable 2',
      'Look for time lags between variables (1-7 days)',
      'Identify if the pattern holds across multiple time periods',
      'Consider if both variables might be responding to a third factor'
    ],
    difficulty: 'beginner'
  },
  {
    id: 'confounding',
    title: 'Control for Confounding Variables',
    description: 'Identify and account for other variables that might influence both',
    icon: <PsychologyIcon />,
    examples: [
      'Consider external factors (weather, stress, hormones, life events)',
      'Look for seasonal patterns or weekly cycles',
      'Check if correlation persists during stable periods',
      'Account for medication changes, diet modifications, or lifestyle shifts'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'mechanism',
    title: 'Establish Biological/Logical Mechanism',
    description: 'Identify a plausible pathway for how one variable affects the other',
    icon: <ScienceIcon />,
    examples: [
      'Research scientific literature for known relationships',
      'Consider biological pathways (hormonal, neurological, metabolic)',
      'Look for dose-response relationships (stronger effect with larger changes)',
      'Evaluate if the timing and magnitude make biological sense'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'intervention',
    title: 'Test with Controlled Changes',
    description: 'The gold standard: deliberately change one variable and observe the effect',
    icon: <SchoolIcon />,
    examples: [
      'Design a personal experiment changing only Variable 1',
      'Use A/B testing periods (alternate between high/low values)',
      'Implement randomized days with different interventions',
      'Control for other variables during the experiment period'
    ],
    difficulty: 'advanced'
  }
];

const commonConfounders = [
  'Sleep quality and duration',
  'Stress levels and major life events',
  'Weather and seasonal changes',
  'Hormonal cycles',
  'Medication or supplement changes',
  'Diet and nutrition changes',
  'Exercise and physical activity',
  'Social activities and relationships',
  'Work schedule and workload',
  'Illness or health changes'
];

export default function CausalAnalysisGuide({
  variable1,
  variable2,
  correlationStrength,
  showWarning = true
}: CausalAnalysisGuideProps) {
  return (
    <Box>
      {showWarning && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          icon={<WarningIcon />}
        >
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            Important: Correlation Does Not Imply Causation
          </Typography>
          <Typography variant="body2">
            Even a {correlationStrength} correlation between <strong>{variable1}</strong> and <strong>{variable2}</strong> doesn't 
            prove one causes the other. Follow these steps to build stronger evidence for causation.
          </Typography>
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Building Evidence for Causation
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Moving from correlation to causation requires systematic investigation. 
            Each step below helps build stronger evidence for a causal relationship.
          </Typography>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {causalAnalysisSteps.map((step, index) => (
          <Accordion key={step.id}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`panel${index}a-content`}
              id={`panel${index}a-header`}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {step.icon}
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {index + 1}. {step.title}
                  </Typography>
                  <Chip 
                    label={step.difficulty} 
                    size="small" 
                    color={
                      step.difficulty === 'beginner' ? 'success' :
                      step.difficulty === 'intermediate' ? 'warning' : 'error'
                    }
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {step.description}
              </Typography>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                For your {variable1} ↔ {variable2} analysis:
              </Typography>
              <List dense>
                {step.examples.map((example, i) => (
                  <ListItem key={i}>
                    <ListItemText 
                      primary={example}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Common Confounding Variables to Consider
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            These factors often influence multiple health and behavior variables simultaneously:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {commonConfounders.map((confounder, index) => (
              <Chip 
                key={index}
                label={confounder} 
                size="small" 
                variant="outlined"
                sx={{ mb: 1 }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'info.light' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          💡 Pro Tip: Start Simple
        </Typography>
        <Typography variant="body2">
          Begin with temporal analysis (Step 1) and confounding variables (Step 2) before moving to 
          more complex experiments. Many apparent causal relationships can be explained by simpler factors.
        </Typography>
      </Paper>
    </Box>
  );
}