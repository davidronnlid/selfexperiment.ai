#!/usr/bin/env node

/**
 * Test Runner Script
 * Runs all test files and provides a comprehensive report
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🧪 SelfDevApp Test Runner");
console.log("==========================\n");

// Test files to run
const testFiles = [
  "src/test/validationTest.ts",
  "src/test/mood-variable-page.test.ts",
  "src/test/variable-page-integration.test.ts",
  "src/test/variables.test.ts",
  "src/test/privacyTest.ts",
];

// Test categories
const testCategories = {
  "Validation Tests": "src/test/validationTest.ts",
  "Mood Variable Page Tests": "src/test/mood-variable-page.test.ts",
  "Variable Page Integration Tests":
    "src/test/variable-page-integration.test.ts",
  "Universal Variables Tests": "src/test/variables.test.ts",
  "Privacy System Tests": "src/test/privacyTest.ts",
};

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Helper function to run a test file
function runTestFile(filePath) {
  try {
    console.log(`${colors.blue}📋 Running: ${filePath}${colors.reset}`);
    console.log("─".repeat(50));

    // Use ts-node to run TypeScript files
    const result = execSync(`npx ts-node ${filePath}`, {
      encoding: "utf8",
      stdio: "pipe",
      cwd: process.cwd(),
    });

    console.log(result);
    return { success: true, output: result };
  } catch (error) {
    console.log(`${colors.red}❌ Test failed: ${filePath}${colors.reset}`);
    console.log(error.stdout || error.message);
    return { success: false, output: error.stdout || error.message };
  }
}

// Helper function to check if file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Main test runner
async function runAllTests() {
  console.log(
    `${colors.cyan}🚀 Starting comprehensive test suite...${colors.reset}\n`
  );

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const [category, filePath] of Object.entries(testCategories)) {
    if (!fileExists(filePath)) {
      console.log(
        `${colors.yellow}⚠️  Test file not found: ${filePath}${colors.reset}`
      );
      continue;
    }

    console.log(`${colors.magenta}📁 Category: ${category}${colors.reset}`);
    const result = runTestFile(filePath);
    results.push({ category, filePath, ...result });

    if (result.success) {
      totalPassed++;
    } else {
      totalFailed++;
    }

    console.log("\n");
  }

  // Summary report
  console.log(`${colors.bright}📊 Test Results Summary${colors.reset}`);
  console.log("=".repeat(50));

  results.forEach((result, index) => {
    const status = result.success
      ? `${colors.green}✅ PASS${colors.reset}`
      : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`${index + 1}. ${result.category}: ${status}`);
  });

  console.log("\n" + "=".repeat(50));
  console.log(
    `${colors.bright}Total: ${totalPassed} passed, ${totalFailed} failed${colors.reset}`
  );

  if (totalFailed === 0) {
    console.log(
      `\n${colors.green}🎉 All tests passed! Your application is working correctly.${colors.reset}`
    );
  } else {
    console.log(
      `\n${colors.red}⚠️  ${totalFailed} test categories failed. Please check the implementation.${colors.reset}`
    );
  }

  // Generate test report file
  const reportPath = "test-report.txt";
  const reportContent =
    `Test Report - ${new Date().toISOString()}\n` +
    "=".repeat(50) +
    "\n\n" +
    results
      .map(
        (result, index) =>
          `${index + 1}. ${result.category}: ${
            result.success ? "PASS" : "FAIL"
          }\n` +
          `   File: ${result.filePath}\n` +
          `   Output: ${result.output.substring(0, 200)}...\n`
      )
      .join("\n") +
    `\nTotal: ${totalPassed} passed, ${totalFailed} failed\n`;

  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n📄 Detailed test report saved to: ${reportPath}`);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error(`${colors.red}💥 Test runner failed:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { runAllTests, runTestFile };
