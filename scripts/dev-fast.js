#!/usr/bin/env node

// Fast development server startup script
console.log("🚀 Starting Next.js in fast development mode...");

// Set performance environment variables
process.env.NEXT_TELEMETRY_DISABLED = "1";
process.env.DISABLE_ESLINT_PLUGIN = "true";
process.env.FAST_REFRESH = "true";

// Start Next.js development server
const { spawn } = require("child_process");

const nextDev = spawn("next", ["dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
  },
});

nextDev.on("close", (code) => {
  console.log(`Development server exited with code ${code}`);
});

nextDev.on("error", (err) => {
  console.error("Failed to start development server:", err);
});
