// src/components/Header.tsx
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import { useUser } from "@/pages/_app";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import MenuIcon from "@mui/icons-material/Menu";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import IconButton from "@mui/material/IconButton";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supaBase";
import { useRouter } from "next/router";
import Divider from "@mui/material/Divider";

export default function Header() {
  const { user, loading, avatarUrl, refreshUser } = useUser();
  const router = useRouter();

  // OAuth profile picture from user metadata
  const oauthProfilePic =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  const displayName = user?.user_metadata?.name || user?.email || "";

  // State for custom avatar from profiles table
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Reset image load error when user changes
  useEffect(() => {
    setImageLoadError(false);
  }, [user]);

  // Fetch custom avatar from profiles table
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) {
        setCustomAvatarUrl(null);
        return;
      }

      setAvatarLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (data?.avatar_url && !error) {
          // Get public URL for the avatar
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(data.avatar_url);

          setCustomAvatarUrl(publicUrlData.publicUrl);
        }
      } catch (error) {
        console.error("Error fetching avatar:", error);
      } finally {
        setAvatarLoading(false);
      }
    };

    fetchAvatar();
  }, [user]);

  // State to track failed image loads
  const [imageLoadError, setImageLoadError] = useState(false);

  // Use custom avatar if available, otherwise fall back to OAuth picture or avatarUrl from useUser
  const profilePic = !imageLoadError
    ? customAvatarUrl || avatarUrl || oauthProfilePic
    : null;

  // Helper for nav link styling
  const navLinkClass =
    "relative px-4 py-2 text-white font-medium transition-all duration-200 hover:text-gold focus:text-gold rounded-lg hover:bg-surface-light" +
    " after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-0.5 after:bg-gold after:transition-all after:duration-300 hover:after:w-full focus:after:w-full";

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [trackAnchorEl, setTrackAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const trackOpen = Boolean(trackAnchorEl);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Track dropdown handlers
  const handleLogClick = (event: React.MouseEvent<HTMLElement>) => {
    setTrackAnchorEl(event.currentTarget);
  };
  const handleLogMenuClose = () => {
    setTrackAnchorEl(null);
  };
  const handleManualLogClick = () => {
    router.push("/track/manual");
    setTrackAnchorEl(null);
    setMobileOpen(false);
  };
  const handleAutoLogClick = () => {
    router.push("/track/auto");
    setTrackAnchorEl(null);
    setMobileOpen(false);
  };

  const handleProfile = () => {
    router.push("/account");
    setAnchorEl(null);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAnchorEl(null);
    setMobileOpen(false);
    window.location.href = "/";
  };

  const handleRefreshAuth = async () => {
    console.log("Manually refreshing authentication...");
    try {
      await refreshUser();
      console.log("Authentication refreshed successfully");
    } catch (err) {
      console.error("Error refreshing auth:", err);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMobileNavClick = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };

  // Mobile menu items - Track items first, then main navigation
  const mobileTrackItems = [
    { text: "Track Manually", path: "/track/manual" },
    { text: "Auto-Track", path: "/track/auto" },
  ];

  const mobileMenuItems = [
    { text: "Analyze", path: "/analyze" },
    { text: "Community", path: "/community" },
  ];

  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        className="bg-surface border-b border-border"
        sx={{
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(26, 26, 26, 0.95)",
        }}
        role="banner"
      >
        <Toolbar className="flex justify-between min-h-16 px-4 lg:px-8">
          <Link
            href="/"
            className="text-white font-bold tracking-tight cursor-pointer hover:opacity-80 transition-all duration-200"
            aria-label="Modular Health home page"
          >
            <Box className="flex items-center gap-2 lg:gap-3">
              <img 
                src="/modular-health-logo.svg" 
                alt="Modular Health" 
                className="h-8 w-auto"
                style={{ height: '32px', width: 'auto' }}
              />
              <span
                className="bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold text-xs px-2 lg:px-3 py-1 rounded-full border border-blue-500 shadow-sm"
                aria-label="Beta version"
              >
                BETA
              </span>
            </Box>
          </Link>

          {/* Desktop Navigation */}
          <Box
            component="nav"
            className="hidden lg:flex items-center gap-2 lg:gap-6"
            role="navigation"
            aria-label="Main navigation"
          >
            {/* Removed Experiments menu and sublinks */}
            <Button
              onClick={handleLogClick}
              className={navLinkClass}
              sx={{
                color: "var(--text-primary)",
                textTransform: "none",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: "0.875rem",
                minWidth: "auto",
                padding: "8px 16px",
              }}
              endIcon={<ArrowDropDownIcon />}
            >
              Track
            </Button>
            <Menu
              anchorEl={trackAnchorEl}
              open={trackOpen}
              onClose={handleLogMenuClose}
              PaperProps={{
                className: "mt-2",
                sx: {
                  minWidth: "200px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
                },
              }}
            >
              <MenuItem onClick={handleManualLogClick} className="py-3">
                <Typography variant="body2" className="font-medium">
                  Track Manually
                </Typography>
              </MenuItem>
              <MenuItem onClick={handleAutoLogClick} className="py-3">
                <Typography variant="body2" className="font-medium">
                  Auto-Track
                </Typography>
              </MenuItem>
            </Menu>

            <Link href="/analyze" passHref>
              <Button
                className={navLinkClass}
                sx={{
                  color: "var(--text-primary)",
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  minWidth: "auto",
                  padding: "8px 16px",
                }}
              >
                Analyze
              </Button>
            </Link>

            <Link href="/community" passHref>
              <Button
                className={navLinkClass}
                sx={{
                  color: "var(--text-primary)",
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  minWidth: "auto",
                  padding: "8px 16px",
                }}
              >
                Community
              </Button>
            </Link>

            {user && (
              <Box className="flex items-center gap-3 ml-4">
                <Button
                  onClick={handleAvatarClick}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-light transition-all duration-200"
                  sx={{
                    color: "var(--text-primary)",
                    textTransform: "none",
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    minWidth: "auto",
                  }}
                >
                  <Avatar
                    src={profilePic || undefined}
                    alt={displayName}
                    className="w-8 h-8 border-2 border-gold"
                    onError={() => {
                      // Mark image as failed to show fallback letter instead
                      setImageLoadError(true);
                    }}
                    sx={{
                      width: 32,
                      height: 32,
                      border: "2px solid var(--gold)",
                      backgroundColor: "var(--surface-light)",
                      color: "var(--text-primary)",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                    }}
                  >
                    {!profilePic && displayName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography
                    variant="body2"
                    className="hidden sm:block font-medium"
                  >
                    {displayName}
                  </Typography>
                  <ArrowDropDownIcon className="text-gold" />
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleMenuClose}
                  PaperProps={{
                    className: "mt-2",
                    sx: {
                      minWidth: "200px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
                    },
                  }}
                >
                  <MenuItem onClick={handleProfile} className="py-3">
                    <Typography variant="body2" className="font-medium">
                      Account
                    </Typography>
                  </MenuItem>
                  <MenuItem onClick={handleLogout} className="py-3">
                    <Typography
                      variant="body2"
                      className="font-medium text-error"
                    >
                      Logout
                    </Typography>
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Box>

          {/* Mobile Menu Button */}
          <Box className="lg:hidden flex items-center gap-2">
            {user && (
              <Avatar
                src={profilePic || undefined}
                alt={displayName}
                className="w-8 h-8 border-2 border-gold"
                onError={() => {
                  // Mark image as failed to show fallback letter instead
                  setImageLoadError(true);
                }}
                sx={{
                  width: 32,
                  height: 32,
                  border: "2px solid var(--gold)",
                  backgroundColor: "var(--surface-light)",
                  color: "var(--text-primary)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                {!profilePic && displayName.charAt(0).toUpperCase()}
              </Avatar>
            )}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ color: "var(--text-primary)" }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        PaperProps={{
          sx: {
            width: 280,
            backgroundColor: "var(--surface)",
            borderLeft: "1px solid var(--border)",
          },
        }}
      >
        <Box className="p-4">
          <Typography variant="h6" className="text-white font-semibold mb-4">
            Menu
          </Typography>

          <List className="space-y-2">
            {/* Track Section - First */}
            <Typography
              variant="subtitle2"
              className="text-gold font-semibold mb-2"
            >
              Track
            </Typography>
            {mobileTrackItems.map((item) => (
              <ListItem
                key={item.text}
                component="div"
                onClick={() => handleMobileNavClick(item.path)}
                className="rounded-lg hover:bg-surface-light transition-all duration-200 cursor-pointer"
                sx={{ minHeight: 48 }}
              >
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    className: "text-white font-medium",
                  }}
                />
              </ListItem>
            ))}

            <Divider className="my-4 border-border" />

            {/* Main Navigation */}
            {mobileMenuItems.map((item) => (
              <ListItem
                key={item.text}
                component="div"
                onClick={() => handleMobileNavClick(item.path)}
                className="rounded-lg hover:bg-surface-light transition-all duration-200 cursor-pointer"
                sx={{ minHeight: 48 }}
              >
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    className: "text-white font-medium",
                  }}
                />
              </ListItem>
            ))}

            {user && (
              <>
                <Divider className="my-4 border-border" />

                {/* User Actions */}
                <Typography
                  variant="subtitle2"
                  className="text-gold font-semibold mb-2"
                >
                  Account
                </Typography>
                <ListItem
                  component="div"
                  onClick={handleProfile}
                  className="rounded-lg hover:bg-surface-light transition-all duration-200 cursor-pointer"
                  sx={{ minHeight: 48 }}
                >
                  <ListItemText
                    primary="Account"
                    primaryTypographyProps={{
                      className: "text-white font-medium",
                    }}
                  />
                </ListItem>
                <ListItem
                  component="div"
                  onClick={handleLogout}
                  className="rounded-lg hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                  sx={{ minHeight: 48 }}
                >
                  <ListItemText
                    primary="Logout"
                    primaryTypographyProps={{
                      className: "text-red-400 font-medium",
                    }}
                  />
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
