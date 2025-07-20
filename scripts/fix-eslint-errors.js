const fs = require("fs");
const path = require("path");

// Function to remove unused imports
function removeUnusedImports(content, unusedImports) {
  let modifiedContent = content;

  unusedImports.forEach((importName) => {
    // Remove from destructured imports
    const destructuredRegex = new RegExp(`\\b${importName}\\b\\s*,?\\s*`, "g");
    modifiedContent = modifiedContent.replace(destructuredRegex, "");

    // Clean up empty destructuring
    modifiedContent = modifiedContent.replace(
      /import\s*{\s*,+\s*}\s*from/g,
      "import {} from"
    );
    modifiedContent = modifiedContent.replace(/import\s*{\s*}\s*from/g, "");
  });

  return modifiedContent;
}

// Function to fix unescaped entities
function fixUnescapedEntities(content) {
  return content.replace(/(?<!\\)"/g, "&quot;").replace(/(?<!\\)'/g, "&apos;");
}

// Function to fix any types
function fixAnyTypes(content) {
  return content.replace(/: any/g, ": unknown").replace(/\bany\b/g, "unknown");
}

// Function to fix const vs let
function fixConstLet(content) {
  return content.replace(/\blet\s+{\s*error\s*}\s*=/g, "const { error } =");
}

// Files to fix with their specific issues
const filesToFix = [
  {
    path: "src/components/ChartSelection.tsx",
    unusedImports: ["Box", "Button"],
    fixUnescaped: false,
    fixAny: false,
    fixConst: false,
  },
  {
    path: "src/components/ComprehensiveHealthDashboard.tsx",
    unusedImports: [
      "Divider",
      "Table",
      "TableBody",
      "TableCell",
      "TableContainer",
      "TableHead",
      "TableRow",
      "FormControl",
      "InputLabel",
      "Select",
      "MenuItem",
      "SelectChangeEvent",
      "Tooltip",
      "Tabs",
      "Tab",
      "Paper",
      "Accordion",
      "AccordionSummary",
      "AccordionDetails",
      "TrendingDownIcon",
      "TrendingFlatIcon",
      "BarChartIcon",
      "LinkIcon",
      "RefreshIcon",
      "SettingsIcon",
      "getOuraVariableLabel",
      "getOuraVariableInfo",
      "formatOuraVariableValue",
      "getOuraVariableInterpretation",
      "OURA_VARIABLES",
      "formatLargeNumber",
      "CorrelationData",
      "formatDate",
      "syncOuraIncremental",
      "syncWithingsIncremental",
    ],
    fixUnescaped: true,
    fixAny: true,
    fixConst: true,
  },
  {
    path: "src/components/ConstrainedInput.tsx",
    unusedImports: [],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/CorrelationAnalysis.tsx",
    unusedImports: ["VariableLinkSimple"],
    fixUnescaped: true,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/DataSourcesAnalysis.tsx",
    unusedImports: [],
    fixUnescaped: false,
    fixAny: false,
    fixConst: false,
  },
  {
    path: "src/components/DetailedCharts.tsx",
    unusedImports: [
      "useCallback",
      "Chip",
      "Divider",
      "Tooltip",
      "Grid",
      "TextField",
      "IconButton",
      "Collapse",
      "Doughnut",
      "BarChart",
      "Timeline",
      "PieChart",
      "ScatterPlot",
      "FilterList",
      "Refresh",
      "differenceInDays",
      "startOfWeek",
      "endOfWeek",
    ],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/EnhancedAnalytics.tsx",
    unusedImports: [
      "Paper",
      "Divider",
      "startOfWeek",
      "endOfWeek",
      "LOG_LABELS",
      "TimelineIcon",
      "InsightsIcon",
    ],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/ErrorBoundary.tsx",
    unusedImports: [],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/InstallPrompt.tsx",
    unusedImports: [],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/LogPrivacyManager.tsx",
    unusedImports: ["IconButton", "FaFilter", "useUser"],
    fixUnescaped: true,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/ManualLogsChart.tsx",
    unusedImports: [
      "Paper",
      "Divider",
      "startOfWeek",
      "endOfWeek",
      "maxDays",
      "getUniqueVariables",
      "prepareChartData",
    ],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/ManualLogsTable.tsx",
    unusedImports: ["Paper", "Divider", "getUniqueVariables"],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/NotificationManager.tsx",
    unusedImports: ["FormControlLabel", "Badge"],
    fixUnescaped: true,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/OptimizedComponents.tsx",
    unusedImports: ["handleVariableUpdated", "stats", "setStats"],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/OuraIntegration.tsx",
    unusedImports: [
      "getOuraVariableInfo",
      "getOuraVariableInterpretation",
      "OURA_VARIABLES",
    ],
    fixUnescaped: true,
    fixAny: false,
    fixConst: false,
  },
  {
    path: "src/components/RoadmapComments.tsx",
    unusedImports: ["Divider", "username"],
    fixUnescaped: false,
    fixAny: false,
    fixConst: false,
  },
  {
    path: "src/components/RoadmapManager.tsx",
    unusedImports: ["HistoryIcon", "editingPost"],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/RoutineLogManager.tsx",
    unusedImports: [
      "Button",
      "Snackbar",
      "MuiAlert",
      "logHistoryOpen",
      "setLogHistoryOpen",
      "logHistory",
      "setLogHistory",
      "logHistoryEdit",
      "setLogHistoryEdit",
      "snackbar",
    ],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/RoutineManager.tsx",
    unusedImports: ["ValidationResult", "variableIndex"],
    fixUnescaped: false,
    fixAny: true,
    fixConst: false,
  },
  {
    path: "src/components/RoutineVariableLogEditor.tsx",
    unusedImports: ["Button", "error"],
    fixUnescaped: false,
    fixAny: false,
    fixConst: false,
  },
  {
    path: "src/components/TimeIntervalSelector.tsx",
    unusedImports: [
      "Button",
      "FormControl",
      "InputLabel",
      "MenuItem",
      "Select",
      "getTotalMinutes",
      "formatDuration",
    ],
    fixUnescaped: true,
    fixAny: false,
    fixConst: false,
  },
  {
    path: "src/components/UnifiedHealthDashboard.tsx",
    unusedImports: ["Button", "Divider", "SyncIcon"],
    fixUnescaped: false,
    fixAny: false,
    fixConst: false,
  },
];

// Process each file
filesToFix.forEach((fileConfig) => {
  const filePath = path.join(process.cwd(), fileConfig.path);

  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");

    // Apply fixes
    if (fileConfig.unusedImports.length > 0) {
      content = removeUnusedImports(content, fileConfig.unusedImports);
    }

    if (fileConfig.fixUnescaped) {
      content = fixUnescapedEntities(content);
    }

    if (fileConfig.fixAny) {
      content = fixAnyTypes(content);
    }

    if (fileConfig.fixConst) {
      content = fixConstLet(content);
    }

    // Write back to file
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Fixed: ${fileConfig.path}`);
  } else {
    console.log(`File not found: ${fileConfig.path}`);
  }
});

console.log("ESLint error fixes completed!");
