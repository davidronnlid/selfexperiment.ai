import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Tooltip,
  styled,
  useTheme,
  useMediaQuery,
  Theme,
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowRight } from '@mui/icons-material';

// Styled components for better table appearance
const StyledTableCell = styled(TableCell)(({ theme }: { theme: Theme }) => ({
  fontSize: '0.875rem',
  padding: '12px 16px',
  borderBottom: '1px solid rgba(224, 224, 224, 1)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '&.year-header': {
    backgroundColor: '#f5f5f5',
    fontWeight: 600,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#eeeeee',
    },
  },
  '&.column-header': {
    backgroundColor: '#fafafa',
    fontWeight: 600,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    minWidth: '100px',
  },
  '&.data-cell': {
    minWidth: '100px',
    maxWidth: '200px',
    position: 'relative',
    '&:hover': {
      overflow: 'visible',
      zIndex: 1,
      '& .cell-content': {
        position: 'absolute',
        backgroundColor: 'white',
        border: '1px solid #ddd',
        padding: '8px 12px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        minWidth: '150px',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
      }
    }
  }
}));

const StyledTableRow = styled(TableRow)(({ theme }: { theme: Theme }) => ({
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  '&.data-row': {
    '& td:first-of-type': {
      paddingLeft: '48px', // Indent for data rows under year
    },
  },
}));

// Column definitions with full names
const COLUMN_DEFINITIONS = [
  { key: 'date', label: 'Date', width: '120px', minWidth: '100px' },
  { key: 'id', label: 'ID', width: '80px', minWidth: '60px' },
  { key: 'weight_kg', label: 'Weight (kg)', width: '120px', minWidth: '100px' },
  { key: 'fat_free_mass', label: 'Fat Free Mass', width: '140px', minWidth: '120px' },
  { key: 'fat_ratio', label: 'Fat Ratio (%)', width: '120px', minWidth: '100px' },
  { key: 'fat_mass_weight', label: 'Fat Mass Weight (kg)', width: '160px', minWidth: '140px' },
  { key: 'muscle_mass', label: 'Muscle Mass (kg)', width: '140px', minWidth: '120px' },
  { key: 'hydration', label: 'Hydration (%)', width: '130px', minWidth: '110px' },
  { key: 'bone_mass', label: 'Bone Mass (kg)', width: '130px', minWidth: '110px' },
];

interface WithingsData {
  date: string;
  id: number;
  weight_kg?: number;
  fat_free_mass?: number;
  fat_ratio?: number;
  fat_mass_weight?: number;
  muscle_mass?: number;
  hydration?: number;
  bone_mass?: number;
}

interface YearData {
  year: string;
  records: WithingsData[];
}

interface WithingsDataTableProps {
  data: YearData[];
}

interface CellContentProps {
  value: any;
  column: typeof COLUMN_DEFINITIONS[0];
}

const WithingsDataTable: React.FC<WithingsDataTableProps> = ({ data }) => {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const toggleYear = (year: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      // Format numbers with appropriate decimal places
      if (value % 1 === 0) return value.toString();
      return value.toFixed(2);
    }
    return String(value);
  };

  const CellContent: React.FC<CellContentProps> = ({ value, column }) => {
    const formattedValue = formatValue(value);
    const isLongValue = formattedValue.length > 12;
    
    // For mobile, always use tooltip
    if (isMobile || isLongValue) {
      return (
        <Tooltip 
          title={
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                {column.label}
              </Typography>
              <Typography variant="body2">
                {formattedValue}
              </Typography>
            </Box>
          } 
          arrow 
          placement="top"
          enterDelay={300}
        >
          <span style={{ cursor: 'help' }}>
            {formattedValue}
          </span>
        </Tooltip>
      );
    }

    return <span>{formattedValue}</span>;
  };

  return (
    <Paper elevation={2} sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ 
        p: 2, 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">
          All Withings Data
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {isMobile ? 'Scroll horizontally to see all columns' : 'Hover over cells for full details'}
        </Typography>
      </Box>
      
      <TableContainer sx={{ 
        maxHeight: '600px', 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          height: '8px',
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#888',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: '#555',
          },
        },
      }}>
        <Table stickyHeader size="small" sx={{ minWidth: isMobile ? '800px' : 'auto' }}>
          <TableHead>
            <TableRow>
              <StyledTableCell className="column-header" sx={{ width: '50px', minWidth: '50px' }} />
              {COLUMN_DEFINITIONS.map((col) => (
                <StyledTableCell 
                  key={col.key} 
                  className="column-header"
                  sx={{ 
                    width: col.width,
                    minWidth: col.minWidth,
                  }}
                >
                  <Tooltip title={col.label} arrow placement="top" enterDelay={500}>
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      cursor: 'help'
                    }}>
                      <span style={{ 
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {col.label}
                      </span>
                    </Box>
                  </Tooltip>
                </StyledTableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((yearData) => (
              <React.Fragment key={yearData.year}>
                {/* Year Header Row */}
                <StyledTableRow>
                  <StyledTableCell 
                    colSpan={COLUMN_DEFINITIONS.length + 1} 
                    className="year-header"
                    onClick={() => toggleYear(yearData.year)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton size="small" sx={{ p: 0 }}>
                        {expandedYears.has(yearData.year) ? 
                          <KeyboardArrowDown /> : 
                          <KeyboardArrowRight />
                        }
                      </IconButton>
                      <Typography variant="subtitle2" component="span" sx={{ fontWeight: 600 }}>
                        {yearData.year}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="span">
                        ({yearData.records.length} records)
                      </Typography>
                    </Box>
                  </StyledTableCell>
                </StyledTableRow>

                {/* Data Rows */}
                <TableRow>
                  <TableCell style={{ padding: 0 }} colSpan={COLUMN_DEFINITIONS.length + 1}>
                    <Collapse in={expandedYears.has(yearData.year)} timeout="auto" unmountOnExit>
                      <Table size="small">
                        <TableBody>
                          {yearData.records.map((record, index) => (
                            <StyledTableRow key={`${yearData.year}-${index}`} className="data-row">
                              <StyledTableCell sx={{ width: '50px', minWidth: '50px' }} />
                              {COLUMN_DEFINITIONS.map((col) => (
                                <StyledTableCell 
                                  key={col.key}
                                  className="data-cell"
                                  sx={{ 
                                    width: col.width,
                                    minWidth: col.minWidth,
                                  }}
                                >
                                  <div className="cell-content">
                                    <CellContent 
                                      value={record[col.key as keyof WithingsData]} 
                                      column={col}
                                    />
                                  </div>
                                </StyledTableCell>
                              ))}
                            </StyledTableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default WithingsDataTable;