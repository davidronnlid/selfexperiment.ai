const fs = require("fs");
const path = require("path");

// Function to add display names to components
function addDisplayNames(content) {
  // Add display names to anonymous components
  const displayNameFixes = [
    {
      pattern: /const OptimizedChart = React\.memo\(\([^)]*\) => \{/g,
      replacement: "const OptimizedChart = React.memo((props) => {",
    },
    {
      pattern: /const OptimizedTable = React\.memo\(\([^)]*\) => \{/g,
      replacement: "const OptimizedTable = React.memo((props) => {",
    },
    {
      pattern: /const OptimizedCard = React\.memo\(\([^)]*\) => \{/g,
      replacement: "const OptimizedCard = React.memo((props) => {",
    },
    {
      pattern: /const OptimizedButton = React\.memo\(\([^)]*\) => \{/g,
      replacement: "const OptimizedButton = React.memo((props) => {",
    },
    {
      pattern: /const OptimizedInput = React\.memo\(\([^)]*\) => \{/g,
      replacement: "const OptimizedInput = React.memo((props) => {",
    },
    {
      pattern: /const OptimizedModal = React\.memo\(\([^)]*\) => \{/g,
      replacement: "const OptimizedModal = React.memo((props) => {",
    },
    {
      pattern: /const OptimizedList = React\.memo\(\([^)]*\) => \{/g,
      replacement: "const OptimizedList = React.memo((props) => {",
    },
  ];

  let modifiedContent = content;
  displayNameFixes.forEach((fix) => {
    modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
  });

  // Add display name assignments
  const displayNameAssignments = [
    'OptimizedChart.displayName = "OptimizedChart";',
    'OptimizedTable.displayName = "OptimizedTable";',
    'OptimizedCard.displayName = "OptimizedCard";',
    'OptimizedButton.displayName = "OptimizedButton";',
    'OptimizedInput.displayName = "OptimizedInput";',
    'OptimizedModal.displayName = "OptimizedModal";',
    'OptimizedList.displayName = "OptimizedList";',
  ];

  // Add display names before the export
  displayNameAssignments.forEach((assignment) => {
    if (
      modifiedContent.includes(assignment.split(".")[0]) &&
      !modifiedContent.includes(assignment)
    ) {
      modifiedContent = modifiedContent.replace(
        /export default/,
        `${assignment}\n\nexport default`
      );
    }
  });

  return modifiedContent;
}

// Function to fix specific variable assignments
function fixVariableAssignments(content) {
  // Remove unused variable assignments
  const unusedVars = [
    "showCorrelationAnalysis",
    "setShowCorrelationAnalysis",
    "timeRange",
    "selectedVar1",
    "selectedVar2",
    "df",
    "handleTimeRangeChange",
    "handleVar1Change",
    "handleVar2Change",
    "regressionLine",
    "logHistoryOpen",
    "setLogHistoryOpen",
    "logHistory",
    "setLogHistory",
    "logHistoryEdit",
    "setLogHistoryEdit",
    "snackbar",
    "getUniqueVariables",
    "prepareChartData",
    "getSharedVariablesCount",
    "formatDate",
    "syncOuraIncremental",
    "syncWithingsIncremental",
    "maxDays",
    "getTotalMinutes",
    "formatDuration",
    "editingPost",
    "ValidationResult",
    "variableIndex",
    "error",
    "stats",
    "setStats",
    "username",
    "HistoryIcon",
    "SyncIcon",
  ];

  let modifiedContent = content;
  unusedVars.forEach((varName) => {
    // Remove variable declarations
    const pattern = new RegExp(`const\\s+${varName}\\s*=\\s*[^;]+;`, "g");
    modifiedContent = modifiedContent.replace(pattern, "");

    // Remove useState declarations
    const useStatePattern = new RegExp(
      `const\\s+\\[${varName}[^\\]]*\\]\\s*=\\s*useState[^;]+;`,
      "g"
    );
    modifiedContent = modifiedContent.replace(useStatePattern, "");
  });

  return modifiedContent;
}

// Function to fix specific error handling
function fixErrorHandling(content) {
  // Fix error.message access on unknown type
  return content.replace(
    /alert\(error\.message\);/g,
    'if (error instanceof Error) {\n        alert(error.message);\n      } else {\n        alert("An unknown error occurred");\n      }'
  );
}

// Function to fix specific useEffect dependencies
function fixSpecificUseEffectDeps(content) {
  const fixes = [
    {
      pattern:
        /useEffect\(\(\) => \{\s*selectedVariableIds\.length > 0\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    // Handle selectedVariableIds changes\n  }, [selectedVariableIds]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*selectedTimeIds\.length > 0\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    // Handle selectedTimeIds changes\n  }, [selectedTimeIds]);",
    },
  ];

  let modifiedContent = content;
  fixes.forEach((fix) => {
    modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
  });

  return modifiedContent;
}

// Files that need specific fixes
const filesToFix = [
  {
    path: "src/components/OptimizedComponents.tsx",
    addDisplayNames: true,
    fixVariables: true,
    fixErrors: false,
    fixUseEffect: false,
  },
  {
    path: "src/components/CorrelationAnalysis.tsx",
    addDisplayNames: false,
    fixVariables: true,
    fixErrors: false,
    fixUseEffect: false,
  },
  {
    path: "src/components/ComprehensiveHealthDashboard.tsx",
    addDisplayNames: false,
    fixVariables: true,
    fixErrors: false,
    fixUseEffect: true,
  },
  {
    path: "src/components/RoutineManager.tsx",
    addDisplayNames: false,
    fixVariables: true,
    fixErrors: false,
    fixUseEffect: true,
  },
  {
    path: "src/components/AvatarUploader.tsx",
    addDisplayNames: false,
    fixVariables: false,
    fixErrors: true,
    fixUseEffect: false,
  },
];

// Process each file
filesToFix.forEach((fileConfig) => {
  const fullPath = path.join(process.cwd(), fileConfig.path);

  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, "utf8");

    // Apply fixes
    if (fileConfig.addDisplayNames) {
      content = addDisplayNames(content);
    }

    if (fileConfig.fixVariables) {
      content = fixVariableAssignments(content);
    }

    if (fileConfig.fixErrors) {
      content = fixErrorHandling(content);
    }

    if (fileConfig.fixUseEffect) {
      content = fixSpecificUseEffectDeps(content);
    }

    // Write back to file
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`Fixed specific issues: ${fileConfig.path}`);
  } else {
    console.log(`File not found: ${fileConfig.path}`);
  }
});

console.log("Specific issues fixes completed!");
