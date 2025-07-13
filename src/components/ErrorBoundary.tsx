import React, { Component, ErrorInfo, ReactNode } from "react";
import { Alert, Button, Container, Typography, Box } from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ errorInfo });

    // Log to analytics service if available
    if (typeof window !== "undefined") {
      const gtag = (window as any).gtag;
      if (typeof gtag === "function") {
        gtag("event", "exception", {
          description: error.toString(),
          fatal: true,
        });
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={this.handleRetry}
                startIcon={<RefreshIcon />}
              >
                Retry
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" gutterBottom>
              We apologize for the inconvenience. Please try refreshing the
              page.
            </Typography>
            {process.env.NODE_ENV === "development" && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{ whiteSpace: "pre-wrap" }}
                >
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
