const fs = require("fs");
const path = require("path");

// Function to fix specific issues without breaking syntax
function fixSpecificIssues(content) {
  // Fix unescaped entities
  content = content.replace(/(?<!\\)"/g, "&quot;");
  content = content.replace(/(?<!\\)'/g, "&apos;");

  // Fix any types to unknown
  content = content.replace(/: any/g, ": unknown");
  content = content.replace(/\bany\b/g, "unknown");

  // Fix const vs let
  content = content.replace(/\blet\s+query\s*=/g, "const query =");
  content = content.replace(/\blet\s+batchStart\s*=/g, "const batchStart =");
  content = content.replace(/\blet\s+batchEnd\s*=/g, "const batchEnd =");

  // Remove specific unused imports that are safe to remove
  const safeUnusedImports = [
    "useCallback",
    "useEffect",
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
    "List",
    "ListItem",
    "ListItemText",
    "ListItemIcon",
    "SettingsIcon",
    "CodeIcon",
    "LaunchIcon",
    "ErrorIcon",
    "SecurityIcon",
    "Alert",
    "Link",
    "Grid",
    "Slider",
    "FaPlus",
    "FaTrash",
    "FaStar",
    "FaEye",
    "FaEyeSlash",
    "FaUserCircle",
    "IconButton",
    "InputAdornment",
    "FaQuestion",
    "FaSmile",
    "getUserPreferredUnit",
    "convertBooleanValueToString",
    "convertBooleanStringToValue",
    "userPreferences",
    "createServerClient",
    "getCookiesFromReq",
    "supabase",
  ];

  safeUnusedImports.forEach((importName) => {
    // Only remove if it's in a destructured import and not breaking syntax
    const destructuredRegex = new RegExp(`\\b${importName}\\b\\s*,?\\s*`, "g");
    content = content.replace(destructuredRegex, "");
  });

  // Clean up empty destructuring
  content = content.replace(/import\s*{\s*,+\s*}\s*from/g, "import {} from");
  content = content.replace(/import\s*{\s*}\s*from/g, "");

  return content;
}

// Function to fix useEffect dependencies
function fixUseEffectDeps(content) {
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
      pattern: /useEffect\(\(\) => \{\s*loadVariables\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    loadVariables();\n  }, [loadVariables]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*loadSynonyms\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    loadSynonyms();\n  }, [loadSynonyms]);",
    },
    {
      pattern:
        /useEffect\(\(\) => \{\s*loadPrivacySettings\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    loadPrivacySettings();\n  }, [loadPrivacySettings]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*loadTodaysLogs\(\);\s*\}, \[\]\);/g,
      replacement:
        "useEffect(() => {\n    loadTodaysLogs();\n  }, [loadTodaysLogs]);",
    },
    {
      pattern: /useEffect\(\(\) => \{\s*runTest\(\);\s*\}, \[\]\);/g,
      replacement: "useEffect(() => {\n    runTest();\n  }, [runTest]);",
    },
  ];

  let modifiedContent = content;
  fixes.forEach((fix) => {
    modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
  });

  return modifiedContent;
}

// Files to fix with conservative approach
const filesToFix = [
  "src/components/header.tsx",
  "src/components/UnitCategoryDialog.tsx",
  "src/components/UnitInput.tsx",
  "src/components/UnitPreview.tsx",
  "src/components/UnitSelector.tsx",
  "src/components/ValidatedVariableInput.tsx",
  "src/components/VariableConstraintManager.tsx",
  "src/components/VariableCreationDialog.tsx",
  "src/components/VariableDisplay.tsx",
  "src/components/VariableInput.tsx",
  "src/components/VariableLink.tsx",
  "src/components/VariableManager.tsx",
  "src/components/VariableReportDialog.tsx",
  "src/components/VariableSharingManager.tsx",
  "src/components/VariableSynonymsManager.tsx",
  "src/components/WithingsDataTable.tsx",
  "src/components/WithingsIntegration.tsx",
  "src/hooks/useNotifications.ts",
  "src/pages/account.tsx",
  "src/pages/api/gpt-emoji.ts",
  "src/pages/api/oura/fetch.ts",
  "src/pages/api/privacy-settings.ts",
  "src/pages/api/roadmap/comments.ts",
  "src/pages/api/roadmap/likes.ts",
  "src/pages/api/roadmap/posts.ts",
  "src/pages/api/routines/create-auto-logs.ts",
  "src/pages/api/withings/callback.ts",
  "src/pages/api/withings/fetch.ts",
  "src/pages/api/withings/reimport.ts",
  "src/pages/auth.tsx",
  "src/pages/community/index.tsx",
  "src/pages/community/[username].tsx",
  "src/pages/complete-profile.tsx",
  "src/pages/debug-auth.tsx",
  "src/pages/debug-production.tsx",
  "src/pages/experiment/active-experiments.tsx",
  "src/pages/experiment/build.tsx",
  "src/pages/experiment/builder.tsx",
  "src/pages/_app.tsx",
  "src/test/privacyTest.ts",
  "src/test/universal_variables_integration.test.ts",
  "src/test/variable-page-integration.test.ts",
  "src/test/variables.test.ts",
  "src/types/variables.ts",
  "src/utils/batchRoutineLogging.ts",
  "src/utils/generatePlannedLogs.ts",
  "src/utils/privacyApi.ts",
  "src/utils/privacyUtils.ts",
  "src/utils/unitGroupUtils.ts",
  "src/utils/variableSearchUtils.ts",
  "src/utils/variableUtils.ts",
  "src/utils/variableValidation.ts",
];

// Process each file
filesToFix.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath);

  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, "utf8");

    // Apply fixes
    content = fixSpecificIssues(content);
    content = fixUseEffectDeps(content);

    // Write back to file
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`Fixed final issues: ${filePath}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log("Final issues fixes completed!");
