const fs = require("fs");
const path = require("path");

// Function to fix useEffect missing dependencies
function fixUseEffectDependencies(content) {
  // Fix specific useEffect dependencies
  const fixes = [
    {
      pattern:
        /useEffect\(\(\) => \{\s*loadVariablePreferences\(\);\s*\}, \[user\]\);/g,
      replacement:
        "useEffect(() => {\n    if (user) {\n      loadVariablePreferences();\n    }\n  }, [user, loadVariablePreferences]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*fetchData\(\);\s*\}, \[\]\);/g,
      replacement: "useEffect(() => {\n    fetchData();\n  }, [fetchData]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*onChartConfigChange\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    onChartConfigChange();\n  }, [onChartConfigChange]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*fetchManualLogs\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    fetchManualLogs();\n  }, [fetchManualLogs]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*getUniqueVariables\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    getUniqueVariables();\n  }, [getUniqueVariables]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*loadLogsWithPrivacySettings\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    loadLogsWithPrivacySettings();\n  }, [loadLogsWithPrivacySettings]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*fetchComments\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    fetchComments();\n  }, [fetchComments]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*fetchCommentCount\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    fetchCommentCount();\n  }, [fetchCommentCount]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*sortPosts\(\);\s*\}, \[\]\);/g,
      replacement: "useEffect(() => {\n    sortPosts();\n  }, [sortPosts]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*fetchPosts\(\);\s*\}, \[\]\);/g,
      replacement: "useEffect(() => {\n    fetchPosts();\n  }, [fetchPosts]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*loadRoutines\(\);\s*loadVariables\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    loadRoutines();\n    loadVariables();\n  }, [loadRoutines, loadVariables]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*checkConnections\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    checkConnections();\n  }, [checkConnections]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*fetchDataCounts\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    fetchDataCounts();\n  }, [fetchDataCounts]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*loadPreferences\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    loadPreferences();\n  }, [loadPreferences]);",
    },
  ];

  let modifiedContent = content;
  fixes.forEach((fix) => {
    modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
  });

  return modifiedContent;
}

// Function to fix useCallback missing dependencies
function fixUseCallbackDependencies(content) {
  // Fix specific useCallback dependencies
  const fixes = [
    {
      pattern:
        /useCallback\(\(\) => \{\s*handleNumberInput\(\);\s*handleScaleInput\(\);\s*handleTextInput\(\);\s*handleTimeInput\(\);\s*handleYesNoInput\(\);\s*\}, \[\]\);/g,
      replacement:
        "useCallback(() => {\n    handleNumberInput();\n    handleScaleInput();\n    handleTextInput();\n    handleTimeInput();\n    handleYesNoInput();\n  }, [handleNumberInput, handleScaleInput, handleTextInput, handleTimeInput, handleYesNoInput]);",
    },
  ];

  let modifiedContent = content;
  fixes.forEach((fix) => {
    modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
  });

  return modifiedContent;
}

// Function to fix useMemo missing dependencies
function fixUseMemoDependencies(content) {
  // Fix specific useMemo dependencies
  const fixes = [
    {
      pattern:
        /useMemo\(\(\) => \{\s*getMatchedDataPoints\(\);\s*getNumericVariables\(\);\s*\}, \[\]\);/g,
      replacement:
        "useMemo(() => {\n    getMatchedDataPoints();\n    getNumericVariables();\n  }, [getMatchedDataPoints, getNumericVariables]);",
    },
    {
      pattern: /useMemo\(\(\) => \{\s*calculateStats\(\);\s*\}, \[\]\);/g,
      replacement:
        "useMemo(() => {\n    calculateStats();\n  }, [calculateStats]);",
    },
  ];

  let modifiedContent = content;
  fixes.forEach((fix) => {
    modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
  });

  return modifiedContent;
}

// Function to fix conditional hook calls
function fixConditionalHooks(content) {
  // Move conditional hooks to top level
  const fixes = [
    {
      pattern: /if\s*\(selectedVariableIds\.length > 0\)\s*\{\s*useMemo\(/g,
      replacement: "const memoizedValue = useMemo(",
    },
    {
      pattern: /if\s*\(selectedTimeIds\.length > 0\)\s*\{\s*useMemo\(/g,
      replacement: "const timeMemoizedValue = useMemo(",
    },
    {
      pattern: /if\s*\(selectedVariableIds\.length > 0\)\s*\{\s*useEffect\(/g,
      replacement: "useEffect(",
    },
    {
      pattern: /if\s*\(selectedTimeIds\.length > 0\)\s*\{\s*useEffect\(/g,
      replacement: "useEffect(",
    },
  ];

  let modifiedContent = content;
  fixes.forEach((fix) => {
    modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
  });

  return modifiedContent;
}

// Function to wrap functions in useCallback
function wrapInUseCallback(content) {
  // Add useCallback import if not present
  if (!content.includes("useCallback")) {
    content = content.replace(
      /import React, \{ ([^}]+) \} from "react";/,
      'import React, { $1, useCallback } from "react";'
    );
  }

  // Wrap specific functions in useCallback
  const functionsToWrap = [
    "getVariableLabel",
    "loadVariablePreferences",
    "fetchData",
    "onChartConfigChange",
    "fetchManualLogs",
    "getUniqueVariables",
    "loadLogsWithPrivacySettings",
    "fetchComments",
    "fetchCommentCount",
    "sortPosts",
    "fetchPosts",
    "loadRoutines",
    "loadVariables",
    "checkConnections",
    "fetchDataCounts",
    "loadPreferences",
    "getMatchedDataPoints",
    "getNumericVariables",
    "calculateStats",
  ];

  functionsToWrap.forEach((funcName) => {
    const pattern = new RegExp(
      `const ${funcName} = \\([^)]*\\) => \\{[^}]*\\};`,
      "g"
    );
    const replacement = `const ${funcName} = useCallback(([^)]*) => {\n    // ... existing code ...\n  }, []);`;
    content = content.replace(pattern, replacement);
  });

  return content;
}

// Files that need React hooks fixes
const filesToFix = [
  "src/components/AnalyzePrivacySection.tsx",
  "src/components/ChartSelection.tsx",
  "src/components/ComprehensiveHealthDashboard.tsx",
  "src/components/ConstrainedInput.tsx",
  "src/components/CorrelationAnalysis.tsx",
  "src/components/DataSourcesAnalysis.tsx",
  "src/components/DetailedCharts.tsx",
  "src/components/EnhancedAnalytics.tsx",
  "src/components/LogPrivacyManager.tsx",
  "src/components/ManualLogsChart.tsx",
  "src/components/ManualLogsTable.tsx",
  "src/components/NotificationManager.tsx",
  "src/components/RoadmapComments.tsx",
  "src/components/RoadmapManager.tsx",
  "src/components/RoutineManager.tsx",
];

// Process each file
filesToFix.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath);

  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, "utf8");

    // Apply fixes
    content = fixUseEffectDependencies(content);
    content = fixUseCallbackDependencies(content);
    content = fixUseMemoDependencies(content);
    content = fixConditionalHooks(content);
    content = wrapInUseCallback(content);

    // Write back to file
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`Fixed React hooks: ${filePath}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log("React hooks fixes completed!");
