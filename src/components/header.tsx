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
import { useState } from "react";
import { supabase } from "@/utils/supaBase";

export default function Header() {
  const { user, loading, avatarUrl } = useUser();
  // Try to get profile table avatar first, then OAuth metadata
  const profilePic =
    avatarUrl ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;
  const displayName = user?.user_metadata?.name || user?.email || "";

  // Helper for nav link underline
  const navLinkClass =
    "relative px-2 py-1 text-black font-medium transition hover:text-purple-700 focus:text-purple-700" +
    " after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-0.5 after:bg-purple-500 after:transition-all after:duration-300 hover:after:w-full focus:after:w-full";

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAnchorEl(null);
    window.location.href = "/";
  };

  return (
    <AppBar
      position="static"
      elevation={1}
      className="bg-white shadow-md border-b border-gray-100"
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
          <Link href="/experiment/builder" className={navLinkClass}>
            Build Experiment
          </Link>
          <Link href="/log" className={navLinkClass}>
            Log Now
          </Link>
          <Link href="/community" className={navLinkClass}>
            Community
          </Link>
          <Link href="/analytics" className={navLinkClass}>
            Analytics
          </Link>
          <Link href="/profile" className={navLinkClass}>
            Profile
          </Link>
          {!loading && !user && (
            <Link href="/auth">
              <Button
                variant="contained"
                className="ml-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-full shadow-lg px-6 py-2 transition-transform transform hover:scale-105 hover:shadow-xl border-0"
                disableElevation
              >
                Sign up / Login
              </Button>
            </Link>
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
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
