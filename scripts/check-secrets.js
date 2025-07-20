#!/usr/bin/env node

/**
 * Security check script to detect hardcoded secrets
 * Run this before committing to prevent exposure of sensitive data
 */

const fs = require("fs");
const path = require("path");

const SECRET_PATTERNS = [
  /eyJ[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*/g, // JWT tokens
  /supabase\.co.*[A-Za-z0-9+/]{30,}/g, // Supabase URLs with embedded keys
  /VAPID_PRIVATE_KEY\s*=\s*["'][A-Za-z0-9+/\-_]{30,}["']/g, // VAPID private keys (not generated ones)
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][A-Za-z0-9+/\-_]{30,}["']/g, // Service role keys
];

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /build/,
  /dist/,
  /coverage/,
  /package-lock\.json/,
  /\.env/,
  /generate-vapid-keys\.js/, // This file generates keys, doesn't store secrets
  /tsconfig\.json/, // Config file, not secrets
];

const INCLUDE_EXTENSIONS = [".js", ".ts", ".tsx", ".jsx", ".md", ".json"];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const violations = [];

    SECRET_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          violations.push({
            file: filePath,
            pattern: index,
            match: match.substring(0, 50) + "...",
            line: content.substring(0, content.indexOf(match)).split("\n")
              .length,
          });
        });
      }
    });

    return violations;
  } catch (error) {
    return [];
  }
}

function scanDirectory(dir) {
  let violations = [];

  try {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);

      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(fullPath))) {
        continue;
      }

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        violations = violations.concat(scanDirectory(fullPath));
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (INCLUDE_EXTENSIONS.includes(ext)) {
          violations = violations.concat(scanFile(fullPath));
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }

  return violations;
}

function main() {
  console.log("🔍 Scanning for hardcoded secrets...\n");

  const violations = scanDirectory(".");

  if (violations.length === 0) {
    console.log("✅ No hardcoded secrets detected!");
    process.exit(0);
  } else {
    console.log("❌ SECURITY VIOLATION: Hardcoded secrets detected!\n");

    violations.forEach((violation) => {
      console.log(`📁 File: ${violation.file}:${violation.line}`);
      console.log(`🔍 Pattern: ${violation.match}`);
      console.log("");
    });

    console.log(
      "🚨 Please remove these hardcoded secrets and use environment variables instead."
    );
    console.log("💡 Guide: https://ntl.fyi/configure-secrets-scanning");

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, scanFile };
