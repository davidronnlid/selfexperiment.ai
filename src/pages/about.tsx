import React from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
  Divider,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import { Shield, Favorite, TrendingUp, Group } from "@mui/icons-material";
import Head from "next/head";
import Link from "next/link";

export default function About() {
  return (
    <>
      <Head>
        <title>About Modular Health - Your Integrated Health Data Platform</title>
        <meta
          name="description"
          content="Learn about Modular Health's mission to provide integrated health data tracking with insightful analyses while giving you complete control. Founded by David Rönnlid."
        />
      </Head>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              background: "linear-gradient(45deg, #ffd700, #ffea70)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            About Modular Health
          </Typography>
                      <Typography
              variant="h5"
              color="text.secondary"
              sx={{ maxWidth: "600px", mx: "auto" }}
            >
              All your health data, one intelligent platform.
            </Typography>
        </Box>

        {/* Mission & Vision */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" sx={{ mb: 3, textAlign: "center" }}>
            Our Mission & Vision
          </Typography>
          
          <Box sx={{ display: "grid", gap: 3, md: { gridTemplateColumns: "1fr 1fr" } }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Favorite sx={{ color: "#ffd700", mr: 1 }} />
                  <Typography variant="h6">Mission</Typography>
                </Box>
                <Typography color="text.secondary">
                  To provide you with an intelligent platform that seamlessly integrates all your 
                  health data sources, delivering personalized insights that help you understand 
                  your unique health patterns. We believe health tracking should be effortless, 
                  comprehensive, and ultimately help you make better decisions about your wellbeing.
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <TrendingUp sx={{ color: "#ffd700", mr: 1 }} />
                  <Typography variant="h6">Vision</Typography>
                </Box>
                <Typography color="text.secondary">
                  Imagine a future where every aspect of your health—physical, mental, 
                  and emotional—converges into a unified understanding of your wellbeing. 
                  Where scattered data points transform into meaningful wisdom, and where 
                  the complexity of human health becomes beautifully simple through 
                  intelligent integration. This is our vision: creating the bridge between 
                  fragmented health information and the profound insights that guide you 
                  toward your optimal self.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Data Privacy Section */}
        <Paper
          elevation={3}
          sx={{
            p: 4,
            mb: 6,
            background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
            border: "1px solid #ffd700",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Shield sx={{ color: "#ffd700", fontSize: 32, mr: 2 }} />
            <Typography variant="h4">Your Data, Your Rights</Typography>
          </Box>

          <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7 }}>
            At Modular Health, we're building the health data platform you've always wanted. 
            Connect your wearables, import from health apps, sync with medical devices, 
            and add manual tracking—all in one place. Our intelligent analytics reveal 
            patterns and insights that individual apps miss, while keeping your data 
            completely under your control.
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#ffd700" }}>
              How We Protect Your Data:
            </Typography>
            <Box component="ul" sx={{ pl: 2, "& li": { mb: 1 } }}>
              <li>
                <Typography>
                  <strong>Your data, your control:</strong> You have complete control over 
                  your personal health data. Any sharing with third parties requires your 
                  explicit agreement and clear understanding of the purpose.
                </Typography>
              </li>
              <li>
                <Typography>
                  <strong>Explicit consent required:</strong> Every data sharing decision 
                  is yours to make. We provide clear information about what data would be 
                  shared, with whom, and for what purpose, then you decide.
                </Typography>
              </li>
              <li>
                <Typography>
                  <strong>Purpose limitation:</strong> We use your data for facilitating 
                  your health tracking, providing you with insights, and improving the 
                  user experience of the app.
                </Typography>
              </li>
              <li>
                <Typography>
                  <strong>Anonymized research:</strong> Population health research uses 
                  only anonymized, aggregated data that cannot be traced back to individuals.
                </Typography>
              </li>
              <li>
                <Typography>
                  <strong>Data portability:</strong> Your data belongs to you. Export it 
                  anytime or delete it completely.
                </Typography>
              </li>
              <li>
                <Typography>
                  <strong>Security first:</strong> Industry-standard encryption, regular 
                  security audits, and <a href="https://www.postgresql.org/docs/current/ddl-rowsecurity.html" 
                  target="_blank" rel="noopener noreferrer" style={{color: "#ffd700"}}>
                  row-level security</a> protect your data at every layer.
                </Typography>
              </li>
            </Box>
          </Box>

          <Typography variant="body2" sx={{ fontStyle: "italic", color: "#b3b3b3" }}>
            Your health data has incredible potential when connected and analyzed intelligently. 
            We believe in giving you complete control over this valuable information while 
            providing insights that help you optimize your wellbeing. When you choose to 
            contribute anonymized data to research, it's always your decision, made through 
            clear consent processes.
          </Typography>
        </Paper>

        {/* Founder Section */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 4 }}>
            Meet the Founder
          </Typography>
          
          <Card sx={{ maxWidth: 600, mx: "auto" }}>
            <CardContent sx={{ p: 4 }}>
              <Avatar
                src="/david-ronnlid-profile.jpg"
                alt="David Rönnlid, Founder & CEO of Modular Health"
                sx={{
                  width: 120,
                  height: 120,
                  mx: "auto",
                  mb: 3,
                  border: "3px solid #ffd700",
                }}
              />
              
              <Typography variant="h5" sx={{ mb: 2 }}>
                David Rönnlid
              </Typography>
              
              <Typography variant="subtitle1" color="primary" sx={{ mb: 3 }}>
                Founder & CEO
              </Typography>
              
              <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                David founded Modular Health with a vision to empower people to achieve 
                their best health through intelligent data integration and analyses. With a background 
                in web technology development and medicine, combined with a passion for personal health 
                optimization, he envisioned a platform that seamlessly integrates all your 
                health data sources to provide the complete picture you need for better health decisions.
              </Typography>
              
              <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
                David believes that by connecting and analyzing your health data intelligently, 
                we can reveal insights that help you optimize your sleep, nutrition, exercise, 
                psychological variables and other aspects of your overall wellbeing in ways that individual apps simply can't match.
              </Typography>

              <Box sx={{ mt: 3, p: 2, backgroundColor: "#0a0a0a", borderRadius: 1 }}>
                <Typography variant="body2" color="#ffd700" sx={{ fontStyle: "italic" }}>
                  "Your health data is incredibly valuable when connected intelligently. 
                  It should give you insights that actually make you healthier and help you feel better, while 
                  always remaining under your complete control."
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Community Section */}
        <Box sx={{ textAlign: "center" }}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
                <Group sx={{ color: "#ffd700", mr: 1 }} />
                <Typography variant="h5">Join Our Community</Typography>
              </Box>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Modular Health is more than a platform—it's your personal health command 
                center where all your data comes together to give you the insights you 
                need to feel your best.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Join users who are discovering patterns in their health data that they 
                never knew existed, making informed decisions, and taking control of 
                their wellbeing like never before.
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Link href="/track/auto" passHref>
                  <Button
                    variant="contained"
                    size="large"
                    sx={{
                      backgroundColor: "#ffd700",
                      color: "#000",
                      fontWeight: 600,
                      px: 4,
                      py: 1.5,
                      "&:hover": {
                        backgroundColor: "#ffea70",
                      },
                    }}
                  >
                    Start Tracking Your Health
                  </Button>
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </>
  );
} 