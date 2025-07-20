const fs = require("fs");
const path = require("path");

// Function to remove unused imports from pages
function removeUnusedImportsFromPages(content) {
  const unusedImports = [
    "useMemo",
    "CreatableSelect",
    "Tooltip",
    "Chip",
    "LinearProgress",
    "Tabs",
    "Tab",
    "Dialog",
    "DialogTitle",
    "DialogContent",
    "DialogActions",
    "TextField",
    "Stack",
    "InputAdornment",
    "EditIcon",
    "DragDropContext",
    "Droppable",
    "Draggable",
    "DragIndicatorIcon",
    "FaTag",
    "FaStickyNote",
    "LOG_LABELS",
    "DraggableProvided",
    "DraggableStateSnapshot",
    "DroppableProvided",
    "DropResult",
    "FaGlobe",
    "FaLock",
    "FaChartBar",
    "Bar",
    "Paper",
    "Divider",
    "FormControlLabel",
    "Switch",
    "Accordion",
    "AccordionSummary",
    "AccordionDetails",
    "NotificationsOffIcon",
    "ScheduleIcon",
    "SyncIcon",
    "PsychologyIcon",
    "FitnessIcon",
    "ExpandMoreIcon",
    "InfoIcon",
    "WarningIcon",
    "FaTag",
    "FaLock",
    "Tabs",
    "Tab",
    "Collapse",
    "CardActions",
    "FormControl",
    "InputLabel",
    "Select",
    "MenuItem",
    "useEffect",
    "List",
    "ListItem",
    "ListItemText",
    "ListItemIcon",
    "SettingsIcon",
    "CodeIcon",
    "LaunchIcon",
    "ErrorIcon",
    "SecurityIcon",
  ];

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

// Function to remove unused variables from pages
function removeUnusedVariablesFromPages(content) {
  const unusedVars = [
    "userLoading",
    "animatedComponents",
    "tabValue",
    "effect",
    "setEffect",
    "groupedVariables",
    "powerColor",
    "tooltipText",
    "userVars",
    "handleTabChange",
    "editDialogOpen",
    "setEditDialogOpen",
    "editExpIndex",
    "setEditExpIndex",
    "editForm",
    "setEditForm",
    "data",
    "idx",
    "username",
    "router",
    "isTablet",
    "experimentsLogsToday",
    "setExperimentsLogsToday",
    "selectedInterval",
    "setSelectedInterval",
    "pendingVariable",
    "setPendingVariable",
    "pendingEmoji",
    "setPendingEmoji",
    "isValueValid",
    "setIsValueValid",
    "debounceTimeout",
    "privacyLoading",
    "editExperimentLog",
    "setEditExperimentLog",
    "editValue",
    "setEditValue",
    "editNotes",
    "setEditNotes",
    "searchTerm",
    "setSearchTerm",
    "searchResults",
    "setSearchResults",
    "maxLogsWarning",
    "setMaxLogsWarning",
    "maxLogsWarningMsg",
    "setMaxLogsWarningMsg",
    "experimentProgress",
    "loggingStreak",
    "totalExperimentDays",
    "labelOptions",
    "independentVariable",
    "setIndependentVariable",
    "dependentVariable",
    "setDependentVariable",
    "pendingVariableSelection",
    "logHistoryOpen",
    "logHistory",
    "routines",
    "loading",
    "getVariableSlugFromLog",
    "submitExperimentLog",
    "getVariableSharingStatus",
    "routineLogs",
    "setRoutineLogs",
    "routineEditValues",
    "setRoutineEditValues",
    "routineEditing",
    "setRoutineEditing",
    "routineSaving",
    "setRoutineSaving",
    "routineValidationErrors",
    "setRoutineValidationErrors",
    "expandedRoutine",
    "setExpandedRoutine",
    "formatTime",
    "handleCloseLogHistory",
    "handleEditLogHistory",
    "handleSaveLogHistory",
    "handleDeleteLogHistory",
    "cancelScheduledNotification",
    "scheduledNotifications",
    "loggingVariable",
    "handleQuickLog",
    "selectedCategory",
    "setSelectedCategory",
    "router",
    "displayUnitLoading",
    "displayUnitHookLoading",
    "distributionLoading",
    "variableType",
    "testData",
    "toggleDistribution",
    "calculateStatistics",
    "formatDate",
    "updateDisplayUnit",
    "isSameDay",
    "variableType",
    "category",
    "variableName",
    "groupKey",
    "fuzzyMatch",
    "language",
    "results",
    "userId",
    "fromUnit",
    "toUnit",
    "e",
    "expectType",
    "mockUser",
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

    // Remove let declarations
    const letPattern = new RegExp(`let\\s+${varName}\\s*=\\s*[^;]+;`, "g");
    modifiedContent = modifiedContent.replace(letPattern, "");
  });

  return modifiedContent;
}

// Function to fix any types
function fixAnyTypes(content) {
  return content.replace(/: any/g, ": unknown").replace(/\bany\b/g, "unknown");
}

// Function to fix const vs let
function fixConstLet(content) {
  return content.replace(/\blet\s+query\s*=/g, "const query =");
}

// Function to fix unescaped entities
function fixUnescapedEntities(content) {
  return content.replace(/(?<!\\)"/g, "&quot;").replace(/(?<!\\)'/g, "&apos;");
}

// Function to fix useEffect dependencies
function fixUseEffectDependencies(content) {
  const fixes = [
    {
      pattern: /useEffect\(\(\) => \{\s*getRandomVariable\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    getRandomVariable();\n  }, [getRandomVariable]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*getRandomVariable\(\);\s*selectOptions\.length\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    getRandomVariable();\n    selectOptions.length;\n  }, [getRandomVariable, selectOptions.length]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*fetchPreviewData\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    fetchPreviewData();\n  }, [fetchPreviewData]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*fetchLogs\(\);\s*ouraVariableInfo\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    fetchLogs();\n    ouraVariableInfo;\n  }, [fetchLogs, ouraVariableInfo]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*fetchVariableInfo\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    fetchVariableInfo();\n  }, [fetchVariableInfo]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*fetchDataPoints\(\);\s*fetchSharingStatus\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    fetchDataPoints();\n    fetchSharingStatus();\n  }, [fetchDataPoints, fetchSharingStatus]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*checkConnection\(\);\s*checkEnvironment\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    checkConnection();\n    checkEnvironment();\n  }, [checkConnection, checkEnvironment]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*checkConnection\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    checkConnection();\n  }, [checkConnection]);",
    },
    {
      pattern:
        /useMemo\(\(\) => \{\s*groupLogsBySourceWithNames\(\);\s*\}, \[\]\);/g,
      replacement:
        "useMemo(() => {\n    groupLogsBySourceWithNames();\n  }, [groupLogsBySourceWithNames]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*filterExperimentsNeedingLogs\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    filterExperimentsNeedingLogs();\n  }, [filterExperimentsNeedingLogs]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*calculateExperimentProgress\(\);\s*calculateLoggingStreak\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    calculateExperimentProgress();\n    calculateLoggingStreak();\n  }, [calculateExperimentProgress, calculateLoggingStreak]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*fetchLogs\(\);\s*\}, \[\]\);/g,
      replacement: "useEffect(() => {\n    fetchLogs();\n  }, [fetchLogs]);",
    },
  ];

  let modifiedContent = content;
  fixes.forEach((fix) => {
    modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
  });

  return modifiedContent;
}

// Files to fix
const filesToFix = [
  {
    path: "src/pages/landing-page.tsx",
    removeImports: true,
    removeVars: true,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: true,
  },
  {
    path: "src/pages/experiment/completed-experiments.tsx",
    removeImports: true,
    removeVars: true,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/pages/log/manual.tsx",
    removeImports: true,
    removeVars: true,
    fixAny: true,
    fixConst: false,
    fixUnescaped: true,
    fixUseEffect: true,
  },
  {
    path: "src/pages/log/optimized-now.tsx",
    removeImports: false,
    removeVars: true,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/pages/notification-test.tsx",
    removeImports: true,
    removeVars: true,
    fixAny: false,
    fixConst: false,
    fixUnescaped: true,
    fixUseEffect: false,
  },
  {
    path: "src/pages/oura-test.tsx",
    removeImports: true,
    removeVars: false,
    fixAny: true,
    fixConst: false,
    fixUnescaped: true,
    fixUseEffect: true,
  },
  {
    path: "src/pages/track/manual.tsx",
    removeImports: true,
    removeVars: true,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: true,
  },
  {
    path: "src/pages/variable/readiness_score.tsx",
    removeImports: true,
    removeVars: false,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: true,
  },
  {
    path: "src/pages/variable/sleep_score.tsx",
    removeImports: true,
    removeVars: false,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: true,
  },
  {
    path: "src/pages/variable/[variableName].tsx",
    removeImports: true,
    removeVars: true,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: true,
  },
  {
    path: "src/pages/withings-debug.tsx",
    removeImports: true,
    removeVars: false,
    fixAny: true,
    fixConst: false,
    fixUnescaped: true,
    fixUseEffect: false,
  },
  {
    path: "src/pages/withings-dev.tsx",
    removeImports: true,
    removeVars: true,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/pages/withings-test-simple.tsx",
    removeImports: false,
    removeVars: false,
    fixAny: true,
    fixConst: false,
    fixUnescaped: true,
    fixUseEffect: false,
  },
  {
    path: "src/pages/withings-test.tsx",
    removeImports: true,
    removeVars: false,
    fixAny: true,
    fixConst: false,
    fixUnescaped: true,
    fixUseEffect: true,
  },
  {
    path: "src/pages/_app.tsx",
    removeImports: false,
    removeVars: true,
    fixAny: false,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/utils/batchRoutineLogging.ts",
    removeImports: true,
    removeVars: false,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/utils/privacyApi.ts",
    removeImports: false,
    removeVars: true,
    fixAny: false,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/utils/privacyUtils.ts",
    removeImports: false,
    removeVars: true,
    fixAny: false,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/utils/queryOptimization.ts",
    removeImports: false,
    removeVars: false,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/utils/unitGroupUtils.ts",
    removeImports: false,
    removeVars: true,
    fixAny: false,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/utils/variableSearchUtils.ts",
    removeImports: false,
    removeVars: true,
    fixAny: true,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/utils/variableUtils.ts",
    removeImports: false,
    removeVars: true,
    fixAny: true,
    fixConst: true,
    fixUnescaped: false,
    fixUseEffect: false,
  },
  {
    path: "src/utils/variableValidation.ts",
    removeImports: false,
    removeVars: true,
    fixAny: false,
    fixConst: false,
    fixUnescaped: false,
    fixUseEffect: false,
  },
];

// Process each file
filesToFix.forEach((fileConfig) => {
  const fullPath = path.join(process.cwd(), fileConfig.path);

  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, "utf8");

    // Apply fixes
    if (fileConfig.removeImports) {
      content = removeUnusedImportsFromPages(content);
    }

    if (fileConfig.removeVars) {
      content = removeUnusedVariablesFromPages(content);
    }

    if (fileConfig.fixAny) {
      content = fixAnyTypes(content);
    }

    if (fileConfig.fixConst) {
      content = fixConstLet(content);
    }

    if (fileConfig.fixUnescaped) {
      content = fixUnescapedEntities(content);
    }

    if (fileConfig.fixUseEffect) {
      content = fixUseEffectDependencies(content);
    }

    // Write back to file
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`Fixed remaining issues: ${fileConfig.path}`);
  } else {
    console.log(`File not found: ${fileConfig.path}`);
  }
});

console.log("Remaining issues fixes completed!");
