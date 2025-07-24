import React from "react";
import { Box, Typography, Link as MuiLink, Container } from "@mui/material";
import Link from "next/link";

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: "#1a1a1a",
        borderTop: "1px solid rgba(255, 215, 0, 0.2)",
        mt: "auto",
        py: 3,
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Link href="/about" passHref>
            <MuiLink
              component="span"
              sx={{
                color: "#b3b3b3",
                textDecoration: "none",
                fontSize: "0.875rem",
                cursor: "pointer",
                "&:hover": {
                  color: "#ffd700",
                  textDecoration: "underline",
                },
              }}
            >
              About Modular Health
            </MuiLink>
          </Link>
        </Box>
        <Box sx={{ textAlign: "center", mt: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: "#666",
              fontSize: "0.75rem",
            }}
          >
            © 2025 Modular Health. Your data, your privacy.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
} 