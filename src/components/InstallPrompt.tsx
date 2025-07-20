import React, { useState, useEffect } from "react";
import { Alert, Button, Box, IconButton } from "@mui/material";
import { Close as CloseIcon, GetApp as InstallIcon } from "@mui/icons-material";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed (standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown).standalone ||
      document.referrer.includes("android-app://");
    setIsStandalone(standalone);

    // Handle the beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    // For iOS, show prompt if not standalone and not dismissed
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed) {
        setShowInstallPrompt(true);
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Desktop install
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    } else if (isIOS) {
      // iOS instructions
      alert(
        'To install this app on your iPhone:\n\n1. Tap the Share button in Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm'
      );
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    if (isIOS) {
      localStorage.setItem("pwa-install-dismissed", "true");
    }
  };

  if (!showInstallPrompt || isStandalone) {
    return null;
  }

  return (
    <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <Alert
        severity="info"
        sx={{
          backgroundColor: "#1a1a1a",
          color: "#ffd700",
          borderBottom: "1px solid #333",
          borderRadius: 0,
          "& .MuiAlert-icon": { color: "#ffd700" },
        }}
        action={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<InstallIcon />}
              onClick={handleInstallClick}
              sx={{
                backgroundColor: "#ffd700",
                color: "#000",
                "&:hover": { backgroundColor: "#ffea70" },
              }}
            >
              {isIOS ? "Install" : "Install App"}
            </Button>
            <IconButton
              size="small"
              onClick={handleDismiss}
              sx={{ color: "#ffd700" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        }
      >
        <strong>Install Modular Health</strong> - Add to your home screen for
        quick access!
      </Alert>
    </Box>
  );
}
