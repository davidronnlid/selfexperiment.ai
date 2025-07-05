import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import WithingsDataTable from '@/components/WithingsDataTable';

// Sample data matching the screenshot
const sampleWithingsData = [
  {
    year: '2023',
    records: [
      // Add sample records for 2023
    ]
  },
  {
    year: '2024',
    records: [
      {
        date: '2024-03-15',
        id: 90,
        weight_kg: 86.184,
        fat_free_mass: undefined,
        fat_ratio: undefined,
        fat_mass_weight: undefined,
        muscle_mass: undefined,
        hydration: undefined,
        bone_mass: undefined,
      },
      {
        date: '2024-03-14',
        id: 89,
        weight_kg: 87.268,
        fat_free_mass: undefined,
        fat_ratio: undefined,
        fat_mass_weight: undefined,
        muscle_mass: undefined,
        hydration: undefined,
        bone_mass: undefined,
      },
      {
        date: '2024-03-13',
        id: 88,
        weight_kg: 86.733,
        fat_free_mass: 76.43,
        fat_ratio: 11.876,
        fat_mass_weight: 10.3,
        muscle_mass: 72.65,
        hydration: 50.03,
        bone_mass: 3.77,
      },
      {
        date: '2024-03-12',
        id: 87,
        weight_kg: 86.692001,
        fat_free_mass: 76.31,
        fat_ratio: 11.962,
        fat_mass_weight: 10.37,
        muscle_mass: 72.54,
        hydration: 50.01,
        bone_mass: 3.76,
      },
      {
        date: '2024-03-11',
        id: 86,
        weight_kg: 86.692001,
        fat_free_mass: 77.1,
        fat_ratio: 11.051,
        fat_mass_weight: 9.58,
        muscle_mass: 73.3,
        hydration: 50.72,
        bone_mass: 3.8,
      },
      {
        date: '2024-03-10',
        id: 85,
        weight_kg: 86.706001,
        fat_free_mass: 76.489997,
        fat_ratio: 11.775424,
        fat_mass_weight: 10.21,
        muscle_mass: 72.709999,
        hydration: 50.289997,
        bone_mass: 3.769999,
      },
    ]
  }
];

export default function WithingsDemo() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        Withings Data Table Demo
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" color="text.secondary" paragraph>
          This table demonstrates improved UX for viewing Withings data:
        </Typography>
        <Box component="ul" sx={{ color: 'text.secondary' }}>
          <li>Hover over column headers to see full names</li>
          <li>Click on year rows to expand/collapse data</li>
          <li>Hover over cells with long values to see complete information</li>
          <li>Sticky headers for better navigation</li>
          <li>Clean, aligned layout with proper indentation</li>
        </Box>
      </Box>

      <WithingsDataTable data={sampleWithingsData} />
    </Container>
  );
}