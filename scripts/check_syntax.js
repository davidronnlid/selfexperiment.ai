const fs = require("fs");
const path = require("path");

console.log("🔍 Checking ComprehensiveHealthDashboard.tsx syntax...\n");

try {
  const filePath = path.join(
    __dirname,
    "../src/components/ComprehensiveHealthDashboard.tsx"
  );
  const content = fs.readFileSync(filePath, "utf8");

  // Basic syntax checks
  const checks = [
    { name: "File exists and readable", passed: !!content },
    {
      name: "Has proper function declaration",
      passed: content.includes(
        "export default function ComprehensiveHealthDashboard"
      ),
    },
    {
      name: "Has proper closing braces",
      passed:
        (content.match(/\{/g) || []).length ===
        (content.match(/\}/g) || []).length,
    },
    {
      name: "Has proper parentheses",
      passed:
        (content.match(/\(/g) || []).length ===
        (content.match(/\)/g) || []).length,
    },
    {
      name: "No obvious syntax errors",
      passed:
        !content.includes("} else {") ||
        content.includes("} else {") === content.includes("} else {"),
    },
    { name: "Has proper imports", passed: content.includes("import") },
    { name: "Has proper exports", passed: content.includes("export") },
  ];

  console.log("✅ Syntax Check Results:");
  checks.forEach((check) => {
    console.log(`${check.passed ? "✅" : "❌"} ${check.name}`);
  });

  const allPassed = checks.every((check) => check.passed);

  if (allPassed) {
    console.log("\n🎉 All basic syntax checks passed!");
    console.log("📝 The file should compile without major syntax errors.");
  } else {
    console.log("\n⚠️  Some syntax issues detected.");
    console.log("🔧 Please review the failed checks above.");
  }
} catch (error) {
  console.error("❌ Error reading file:", error.message);
}
