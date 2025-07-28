import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Apple as AppleIcon,
  Smartphone as PhoneIcon,
  Computer as ComputerIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Launch as LaunchIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { getDeviceInfo, getAppleHealthSyncAppUrl, getAppStoreUrl, generateAppleHealthInstructions, DeviceInfo } from '@/utils/deviceDetection';

interface AppleHealthConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onConnectionSuccess?: () => void;
}

export default function AppleHealthConnectionDialog({
  open,
  onClose,
  userId,
  onConnectionSuccess
}: AppleHealthConnectionDialogProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDeviceInfo(getDeviceInfo());
    }
  }, [open]);

  const handleClose = () => {
    setLoading(false);
    onClose();
  };

  const handleOpenIOSApp = () => {
    setLoading(true);
    
    // Create deep link to open the native iOS app
    const appUrl = `modularhealth://sync?source=web&user_id=${userId}&action=sync_apple_health`;
      
    // Try to open the native iOS app
      window.location.href = appUrl;
      
    // Show a message if the app doesn't open
      setTimeout(() => {
      setLoading(false);
      alert(
        'If the Modular Health app didn\'t open automatically:\n\n' +
        '1. Make sure the Modular Health iOS app is installed\n' +
        '2. Open the app manually\n' +
        '3. Grant HealthKit permissions when prompted\n\n' +
        'Note: HealthKit data can only be accessed through the native iOS app, not the web browser.'
      );
    }, 3000);
  };

  const handleInstallApp = () => {
    // For now, show instructions since the app may not be in App Store yet
    alert(
      'To sync Apple Health data:\n\n' +
      '1. Install the Modular Health iOS app from the App Store (coming soon)\n' +
      '2. Or contact support for TestFlight access\n' +
      '3. Open the iOS app and grant HealthKit permissions\n\n' +
      'Apple Health data cannot be accessed from web browsers - only native iOS apps.'
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1a1a1a',
          color: 'white',
          border: '1px solid #333',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AppleIcon sx={{ color: '#ffd700' }} />
          Connect Apple Health
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        {deviceInfo?.canSyncAppleHealth ? (
          <PhoneIcon sx={{ color: 'success.main', fontSize: 40 }} />
        ) : (
          <ComputerIcon sx={{ color: 'warning.main', fontSize: 40 }} />
        )}
        <Box>
          <Typography variant="h6">
            {deviceInfo?.canSyncAppleHealth ? 'iOS Device Detected' : 'Non-iOS Device Detected'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
                {deviceInfo?.canSyncAppleHealth 
                  ? 'Ready to connect to Apple Health via native iOS app'
                  : 'Apple Health requires the native iOS app'
                }
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip 
          label={`Platform: ${deviceInfo?.isIOS ? 'iOS' : deviceInfo?.isMac ? 'macOS' : deviceInfo?.isAndroid ? 'Android' : 'Other'}`}
          size="small"
          color={deviceInfo?.canSyncAppleHealth ? 'success' : 'default'}
        />
        <Chip 
          label={`Device: ${deviceInfo?.deviceType}`}
          size="small"
        />
        <Chip 
          label={`Browser: ${deviceInfo?.browser}`}
          size="small"
        />
      </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
              <strong>Important:</strong> Apple Health (HealthKit) data can only be accessed through native iOS apps, not web browsers. 
              You'll need to use the Modular Health iOS app to grant HealthKit permissions and sync your health data.
          </Typography>
        </Alert>

      {deviceInfo?.canSyncAppleHealth ? (
        <Box>
          <Typography variant="h6" gutterBottom>
                Connect via iOS App
          </Typography>
          
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              size="large"
                  startIcon={loading ? <CircularProgress size={20} /> : <AppleIcon />}
                  onClick={handleOpenIOSApp}
              disabled={loading}
              sx={{ 
                py: 2,
                backgroundColor: '#007AFF',
                '&:hover': { backgroundColor: '#0056CC' }
              }}
            >
                  Open Modular Health iOS App
            </Button>
            
            <Button
              variant="outlined"
              size="large"
                  startIcon={<DownloadIcon />}
                  onClick={handleInstallApp}
              sx={{ py: 2 }}
            >
                  Install iOS App (if needed)
            </Button>
          </Box>

              <Alert severity="success">
            <Typography variant="body2">
                  <strong>Next Steps:</strong>
                  <br />• Open the Modular Health iOS app
                  <br />• Tap "Grant HealthKit Access" 
                  <br />• The native HealthKit permission dialog will appear
                  <br />• Grant access to your health data
                  <br />• Your data will sync automatically
            </Typography>
          </Alert>
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
                Apple Health Requires iOS
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
                  Apple Health data can only be accessed from iOS devices (iPhone/iPad). 
                  Please use your iOS device to connect Apple Health, then you can view the synced data on any device.
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
                  variant="outlined"
          size="large"
                  startIcon={<PhoneIcon />}
                  onClick={() => {
                    alert(
                      'To connect Apple Health:\n\n' +
                      '1. Open this website on your iPhone or iPad\n' +
                      '2. Or install the Modular Health iOS app\n' +
                      '3. Grant HealthKit permissions in the iOS app\n' +
                      '4. Your health data will sync and be viewable here'
                    );
                  }}
                  sx={{ py: 2 }}
        >
                  I'll Use My iPhone/iPad
        </Button>
        
        <Button
          variant="outlined"
                  onClick={handleClose}
                  sx={{ py: 1 }}
        >
                  Continue Without Apple Health
        </Button>
      </Box>
    </Box>
          )}

          <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(255, 215, 0, 0.1)', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
              <strong>Why can't I grant access in the browser?</strong>
              <br />
              Apple's HealthKit framework is only available to native iOS apps for privacy and security reasons. 
              Web browsers cannot access this data directly.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Close
          </Button>
      </DialogActions>
    </Dialog>
  );
} 