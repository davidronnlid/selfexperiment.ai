import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Chip,
} from "@mui/material";
import { supabase } from "@/utils/supaBase";

interface AuthTest {
  name: string;
  status: 'pending' | 'success' | 'error' | 'timeout';
  message: string;
  duration?: number;
  details?: any;
}

export default function TestAuth() {
  const [tests, setTests] = useState<AuthTest[]>([]);
  const [running, setRunning] = useState(false);

  const updateTest = (name: string, result: Partial<AuthTest>) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, ...result } : test
    ));
  };

  const runAuthTests = async () => {
    setRunning(true);
    setTests([]);

    // Test 1: Basic Supabase connection
    updateTest("supabase-connection", { 
      name: "supabase-connection", 
      status: 'pending', 
      message: "Testing basic Supabase connection..." 
    });

    try {
      const startTime = Date.now();
      const { data, error } = await supabase.from('variables').select('count').limit(1);
      const duration = Date.now() - startTime;

      if (error) {
        updateTest("supabase-connection", {
          status: 'error',
          message: `Connection failed: ${error.message}`,
          duration,
          details: error
        });
      } else {
        updateTest("supabase-connection", {
          status: 'success',
          message: `Connection successful (${duration}ms)`,
          duration
        });
      }
    } catch (error) {
      updateTest("supabase-connection", {
        status: 'error',
        message: `Connection failed: ${error}`,
        details: error
      });
    }

    // Test 2: Auth session check
    updateTest("auth-session", { 
      name: "auth-session", 
      status: 'pending', 
      message: "Checking auth session..." 
    });

    try {
      const startTime = Date.now();
      const { data, error } = await supabase.auth.getSession();
      const duration = Date.now() - startTime;

      if (error) {
        updateTest("auth-session", {
          status: 'error',
          message: `Session check failed: ${error.message}`,
          duration,
          details: error
        });
      } else {
        updateTest("auth-session", {
          status: 'success',
          message: `Session check successful (${duration}ms) - User: ${data.session?.user?.email || 'Not logged in'}`,
          duration,
          details: data.session
        });
      }
    } catch (error) {
      updateTest("auth-session", {
        status: 'error',
        message: `Session check failed: ${error}`,
        details: error
      });
    }

    // Test 3: Auth user check (the problematic one)
    updateTest("auth-user", { 
      name: "auth-user", 
      status: 'pending', 
      message: "Checking auth user..." 
    });

    try {
      const startTime = Date.now();
      const { data, error } = await supabase.auth.getUser();
      const duration = Date.now() - startTime;

      if (error) {
        updateTest("auth-user", {
          status: 'error',
          message: `User check failed: ${error.message}`,
          duration,
          details: error
        });
      } else {
        updateTest("auth-user", {
          status: 'success',
          message: `User check successful (${duration}ms) - User: ${data.user?.email || 'Not logged in'}`,
          duration,
          details: data.user
        });
      }
    } catch (error) {
      updateTest("auth-user", {
        status: 'error',
        message: `User check failed: ${error}`,
        details: error
      });
    }

    setRunning(false);
  };

  const getStatusColor = (status: AuthTest['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'timeout': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: AuthTest['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'timeout': return '⏰';
      default: return '⏳';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        🔐 Auth Test Page
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This page tests the specific authentication calls that might be causing the loading hang.
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Button 
          variant="contained" 
          onClick={runAuthTests}
          disabled={running}
          sx={{ mr: 2 }}
        >
          {running ? 'Running Tests...' : 'Run Auth Tests'}
        </Button>
        {running && <CircularProgress size={20} />}
      </Box>

      {tests.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Auth Test Results
            </Typography>
            
            {tests.map((test, index) => (
              <Box key={test.name} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Chip
                    label={`${getStatusIcon(test.status)} ${test.name}`}
                    color={getStatusColor(test.status)}
                    variant={test.status === 'pending' ? 'outlined' : 'filled'}
                  />
                  {test.duration && (
                    <Typography variant="body2" color="text.secondary">
                      {test.duration}ms
                    </Typography>
                  )}
                </Box>
                
                <Typography variant="body2" sx={{ ml: 2, mb: 1 }}>
                  {test.message}
                </Typography>
                
                {test.details && (
                  <Alert severity="info" sx={{ ml: 2, mb: 1 }}>
                    <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                      {JSON.stringify(test.details, null, 2)}
                    </Typography>
                  </Alert>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {tests.length > 0 && !running && (
        <Box sx={{ mt: 4 }}>
          <Alert severity="info">
            <Typography variant="h6" gutterBottom>
              💡 What to look for:
            </Typography>
            <ul>
              <li><strong>If supabase-connection fails:</strong> Network or CORS issue</li>
              <li><strong>If auth-session times out:</strong> Supabase auth servers slow</li>
              <li><strong>If auth-user hangs:</strong> This is likely your loading issue</li>
              <li><strong>If all succeed:</strong> The issue might be in your app's auth flow</li>
            </ul>
            
            <Typography variant="body2" sx={{ mt: 2 }}>
              <strong>Next Steps:</strong> 
              {tests.find(t => t.name === 'auth-user' && t.status === 'error') ? 
                ' The auth-user call is failing. Check browser console for more details.' :
                ' Check if any test hangs or takes too long (>5 seconds).'
              }
            </Typography>
          </Alert>
        </Box>
      )}
    </Container>
  );
} 