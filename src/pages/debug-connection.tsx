import React, { useState } from "react";
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
  Divider,
} from "@mui/material";
import { supabase } from "@/utils/supaBase";

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'timeout';
  message: string;
  duration?: number;
  details?: any;
}

export default function DebugConnection() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const updateTest = (name: string, result: Partial<TestResult>) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, ...result } : t);
      } else {
        return [...prev, { name, status: 'pending', message: '', ...result }];
      }
    });
  };

  const runTests = async () => {
    setRunning(true);
    setTests([]);

    // Test 1: Environment Variables
    updateTest('env-vars', { status: 'pending', message: 'Checking environment variables...' });
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        updateTest('env-vars', { 
          status: 'error', 
          message: 'Missing environment variables',
          details: { 
            hasUrl: !!supabaseUrl, 
            hasKey: !!supabaseAnonKey,
            urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING'
          }
        });
      } else if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
        updateTest('env-vars', { 
          status: 'error', 
          message: 'Using placeholder environment variables',
          details: { supabaseUrl }
        });
      } else {
        updateTest('env-vars', { 
          status: 'success', 
          message: `Environment variables configured`,
          details: { urlPreview: `${supabaseUrl.substring(0, 50)}...` }
        });
      }
    } catch (error) {
      updateTest('env-vars', { status: 'error', message: 'Error checking env vars', details: error });
    }

    // Test 2: Basic Network Connection
    updateTest('network', { status: 'pending', message: 'Testing network connectivity...' });
    try {
      const start = Date.now();
      const response = await fetch('https://www.google.com/favicon.ico', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      const duration = Date.now() - start;
      
      updateTest('network', { 
        status: 'success', 
        message: `Network connectivity confirmed`,
        duration,
        details: { status: response.status }
      });
    } catch (error: any) {
      updateTest('network', { 
        status: 'error', 
        message: 'Network connectivity failed',
        details: error.message
      });
    }

    // Test 3: Supabase URL Reachability
    updateTest('supabase-url', { status: 'pending', message: 'Testing Supabase URL reachability...' });
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        const start = Date.now();
        const response = await fetch(`${supabaseUrl}/rest/v1/`, { 
          method: 'HEAD',
          mode: 'cors',
          headers: {
            'apikey': supabaseAnonKey
          }
        });
        const duration = Date.now() - start;
        
        updateTest('supabase-url', { 
          status: response.ok ? 'success' : 'error', 
          message: response.ok ? 'Supabase URL reachable' : `HTTP ${response.status}`,
          duration,
          details: { status: response.status, statusText: response.statusText }
        });
      } else {
        updateTest('supabase-url', { status: 'error', message: 'No Supabase URL or key configured' });
      }
    } catch (error: any) {
      updateTest('supabase-url', { 
        status: 'error', 
        message: 'Supabase URL unreachable',
        details: error.message
      });
    }

    // Test 4: Auth Session Check
    updateTest('auth-session', { status: 'pending', message: 'Checking auth session...' });
    try {
      const start = Date.now();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 8 seconds')), 8000)
      );
      
      const result = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]);
      
      const duration = Date.now() - start;
      
      updateTest('auth-session', { 
        status: 'success', 
        message: (result as any).data?.session ? 'Active session found' : 'No active session',
        duration,
        details: { 
          hasSession: !!(result as any).data?.session,
          error: (result as any).error?.message
        }
      });
    } catch (error: any) {
      updateTest('auth-session', { 
        status: error.message.includes('Timeout') ? 'timeout' : 'error', 
        message: error.message,
        details: error
      });
    }

    // Test 5: Auth User Check (the problematic one)
    updateTest('auth-user', { status: 'pending', message: 'Checking auth user (this often hangs)...' });
    try {
      const start = Date.now();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 8 seconds')), 8000)
      );
      
      const result = await Promise.race([
        supabase.auth.getUser(),
        timeoutPromise
      ]);
      
      const duration = Date.now() - start;
      
      updateTest('auth-user', { 
        status: 'success', 
        message: (result as any).data?.user ? `User found: ${(result as any).data.user.email}` : 'No user found',
        duration,
        details: { 
          hasUser: !!(result as any).data?.user,
          userEmail: (result as any).data?.user?.email,
          error: (result as any).error?.message
        }
      });
    } catch (error: any) {
      updateTest('auth-user', { 
        status: error.message.includes('Timeout') ? 'timeout' : 'error', 
        message: error.message,
        details: error
      });
    }

    setRunning(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'timeout': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'timeout': return '⏰';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        🔍 Debug Connection Issues
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This page tests your Supabase connection step by step to identify what's causing the hang.
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Button 
          variant="contained" 
          onClick={runTests}
          disabled={running}
          sx={{ mr: 2 }}
        >
          {running ? 'Running Tests...' : 'Run Debug Tests'}
        </Button>
        {running && <CircularProgress size={20} />}
      </Box>

      {tests.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Results
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
                
                {index < tests.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {tests.length > 0 && !running && (
        <Box sx={{ mt: 4 }}>
          <Alert severity="info">
            <Typography variant="h6" gutterBottom>
              💡 Diagnosis:
            </Typography>
            <ul>
              <li><strong>If env-vars failed:</strong> Check your .env.local file has valid Supabase credentials</li>
              <li><strong>If network failed:</strong> Check your internet connection</li>
              <li><strong>If supabase-url failed:</strong> Your Supabase project might be down or paused</li>
              <li><strong>If auth-user timed out:</strong> This is likely causing your loading hang - Supabase auth servers might be slow</li>
            </ul>
            
            <Typography variant="body2" sx={{ mt: 2 }}>
              <strong>Next Steps:</strong> 
              {tests.find(t => t.name === 'auth-user' && t.status === 'timeout') ? 
                ' The auth-user timeout is causing your loading hang. Try refreshing or check Supabase status.' :
                ' Check browser console (F12) for additional error details.'
              }
            </Typography>
          </Alert>
        </Box>
      )}
    </Container>
  );
} 