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
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supaBase";
import { useRouter } from "next/router";

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

  // Use custom avatar if available, otherwise fall back to OAuth picture or avatarUrl from useUser
  const profilePic = customAvatarUrl || avatarUrl || oauthProfilePic;

  // Helper for nav link underline
  const navLinkClass =
    "relative px-2 py-1 text-black font-medium transition hover:text-purple-700 focus:text-purple-700" +
    " after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-0.5 after:bg-purple-500 after:transition-all after:duration-300 hover:after:w-full focus:after:w-full";

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [experimentAnchorEl, setExperimentAnchorEl] =
    useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const experimentOpen = Boolean(experimentAnchorEl);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExperimentClick = (event: React.MouseEvent<HTMLElement>) => {
    setExperimentAnchorEl(event.currentTarget);
  };
  const handleExperimentMenuClose = () => {
    setExperimentAnchorEl(null);
  };
  const handleBuildClick = () => {
    router.push("/experiment/builder");
    setExperimentAnchorEl(null);
  };
  const handleActiveClick = () => {
    router.push("/experiment/active-experiments");
    setExperimentAnchorEl(null);
  };
  const handleCompletedClick = () => {
    router.push("/experiment/completed-experiments");
    setExperimentAnchorEl(null);
  };
  const handleProfile = () => {
    router.push("/profile");
    setAnchorEl(null);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAnchorEl(null);
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

  return (
    <AppBar
      position="static"
      elevation={1}
      className="bg-white shadow-md border-b border-gray-100"
      sx={{
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }}
    >
      <Toolbar className="flex justify-between min-h-20">
        <Link
          href="/"
          className="text-purple-700 font-extrabold tracking-tight cursor-pointer hover:text-purple-900 transition bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent"
        >
          <Box className="flex items-center gap-2">
            <Typography variant="h5" component="span">
              SelfExperiment.AI
            </Typography>
            <span
              style={{
                background: "linear-gradient(90deg, #FFD700 0%, #FFEA70 100%)",
                color: "#111",
                fontWeight: 700,
                fontSize: "0.8rem",
                borderRadius: "999px",
                padding: "2px 12px",
                marginLeft: "10px",
                letterSpacing: "0.08em",
                display: "inline-flex",
                alignItems: "center",
                boxShadow: "0 1px 4px 0 rgba(0,0,0,0.10)",
                border: "1px solid #ffe066",
              }}
            >
              BETA
            </span>
          </Box>
        </Link>
        <Box className="flex items-center gap-6">
          <Button
            onClick={handleExperimentClick}
            className={navLinkClass}
            sx={{
              color: "#FFD700",
              textTransform: "none",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              "&:hover": {
                backgroundColor: "transparent",
                color: "#FFEA70",
              },
            }}
            endIcon={<ArrowDropDownIcon sx={{ color: "#FFD700" }} />}
          >
            Experiment
          </Button>
          <Menu
            anchorEl={experimentAnchorEl}
            open={experimentOpen}
            onClose={handleExperimentMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <MenuItem onClick={handleBuildClick}>Build</MenuItem>
            <MenuItem onClick={handleActiveClick}>Active</MenuItem>
            <MenuItem onClick={handleCompletedClick}>Completed</MenuItem>
          </Menu>
          <Link href="/log" className={navLinkClass}>
            Log Now
          </Link>
          <Link href="/community" className={navLinkClass}>
            Community
          </Link>
          <Link href="/analytics" className={navLinkClass}>
            Analytics
          </Link>
          {!loading && !user && (
            <>
              <Button
                onClick={handleRefreshAuth}
                variant="outlined"
                size="small"
                sx={{ mr: 1 }}
              >
                Refresh Auth
              </Button>
              <Link href="/auth">
                <Button
                  variant="contained"
                  className="ml-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-full shadow-lg px-6 py-2 transition-transform transform hover:scale-105 hover:shadow-xl border-0"
                  disableElevation
                >
                  Sign up / Login
                </Button>
              </Link>
            </>
          )}
          {!loading && user && (
            <>
              <Avatar
                alt={displayName}
                src={profilePic || undefined}
                className="ml-2 ring-2 ring-purple-400 shadow-lg cursor-pointer hover:ring-4 hover:ring-pink-400 transition-all duration-200"
                sx={{ width: 44, height: 44 }}
                onClick={handleAvatarClick}
              >
                {displayName?.[0]?.toUpperCase() || "U"}
              </Avatar>
              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem onClick={handleProfile}>Profile</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
