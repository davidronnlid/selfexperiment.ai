import React from 'react';
import { Box, Container, Typography, Paper, Alert } from '@mui/material';
import { GetServerSideProps } from 'next';
import MergedVariableDisplay from '@/components/MergedVariableDisplay';

interface DemoPageProps {
  userId: string | null;
}

export default function MergedVariablesDemo({ userId }: DemoPageProps) {
  if (!userId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Please sign in to view merged variables demo.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Merged Variables Demo
        </Typography>
        <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
          Demonstration of variable merging across multiple data sources with correlation analysis
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>What you're seeing:</strong> This demo shows how the same variable (body weight) 
            can be tracked from multiple sources (Apple Health, Withings, manual entry) and displayed 
            as a unified view with source transparency and intraclass correlation analysis.
          </Typography>
        </Alert>
      </Box>

      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Body Weight - All Sources
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          This example merges weight data from Apple Health and manual entries, showing:
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>📊 Timeline chart with all data sources</li>
          <li>🔍 Source-specific data table</li>
          <li>📈 Intraclass correlation analysis between sources</li>
          <li>⚖️ Source priority and accuracy information</li>
          <li>🎯 Clear identification of which source each data point came from</li>
        </Box>
      </Paper>

      <MergedVariableDisplay 
        mergeGroupSlug="body_weight"
        userId={userId}
        onConfigChange={(config) => {
          console.log('Merge configuration changed:', config);
        }}
      />

      <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Key Features Demonstrated
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li><strong>Source Transparency:</strong> Each data point clearly shows which source it came from</li>
          <li><strong>Priority System:</strong> Sources are ranked by accuracy and reliability</li>
          <li><strong>Unit Conversion:</strong> All sources converted to a canonical unit (kg)</li>
          <li><strong>Correlation Analysis:</strong> ICC shows how well different sources agree</li>
          <li><strong>Quality Metrics:</strong> Mean bias, accuracy percentages, and error measurements</li>
          <li><strong>User Control:</strong> Toggle source visibility and correlation display</li>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: 3, mt: 4, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Technical Implementation
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This system enables you to customize which variables should be merged while maintaining 
          complete source transparency. Key benefits:
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>✅ Same variable from multiple sources unified in one view</li>
          <li>✅ Data points clearly separated by source</li>
          <li>✅ Intraclass correlation showing source agreement</li>
          <li>✅ User can see exactly which data point came from which source</li>
          <li>✅ Configurable merge groups for different variables</li>
          <li>✅ Source priority and accuracy tracking</li>
        </Box>
      </Paper>
    </Container>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // For demo purposes, use the test user ID
  // In production, you'd get this from authentication
  const userId = 'bb0ac2ff-72c5-4776-a83a-01855bff4df0';

  return {
    props: {
      userId,
    },
  };
}; 