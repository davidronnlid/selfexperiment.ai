#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🚀 Performance Optimization Script");
console.log("=================================");

// Configuration
const config = {
  bundleAnalyzer: process.env.ANALYZE === "true",
  verbose: process.env.VERBOSE === "true",
  fix: process.env.FIX === "true",
};

// Performance issues to check
const checks = [
  {
    name: "Bundle Size Analysis",
    description: "Analyze bundle size and identify large dependencies",
    run: analyzeBundleSize,
  },
  {
    name: "Database Query Optimization",
    description: "Check for inefficient database queries",
    run: analyzeQueries,
  },
  {
    name: "Component Optimization",
    description: "Check for unoptimized React components",
    run: analyzeComponents,
  },
  {
    name: "Image Optimization",
    description: "Check for unoptimized images",
    run: analyzeImages,
  },
  {
    name: "Cache Configuration",
    description: "Verify caching is properly configured",
    run: analyzeCaching,
  },
  {
    name: "Performance Monitoring",
    description: "Set up performance monitoring",
    run: setupMonitoring,
  },
];

// Main execution
async function main() {
  console.log("Starting performance analysis...\n");

  const results = [];

  for (const check of checks) {
    console.log(`📊 Running: ${check.name}`);
    console.log(`   ${check.description}`);

    try {
      const result = await check.run();
      results.push({ name: check.name, result, status: "success" });
      console.log(`   ✅ Completed\n`);
    } catch (error) {
      results.push({ name: check.name, error: error.message, status: "error" });
      console.log(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // Print summary
  console.log("\n📋 Performance Analysis Summary");
  console.log("==============================");

  results.forEach((result, index) => {
    const status = result.status === "success" ? "✅" : "❌";
    console.log(`${index + 1}. ${status} ${result.name}`);

    if (result.status === "error") {
      console.log(`   Error: ${result.error}`);
    } else if (result.result && config.verbose) {
      console.log(`   Result: ${JSON.stringify(result.result, null, 2)}`);
    }
  });

  // Generate recommendations
  generateRecommendations(results);
}

// Bundle size analysis
async function analyzeBundleSize() {
  console.log("   Analyzing bundle size...");

  const bundleAnalysisPath = path.join(process.cwd(), "bundle-analysis.json");

  try {
    // Run bundle analysis
    if (config.bundleAnalyzer) {
      execSync("npm run build", { stdio: "pipe" });
      execSync("ANALYZE=true npm run build", { stdio: "pipe" });
    }

    // Check package.json for large dependencies
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const largeDependencies = [];

    // Known large packages
    const knownLargePackages = [
      "@mui/material",
      "@mui/icons-material",
      "chart.js",
      "react-icons",
      "moment",
      "lodash",
    ];

    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [name, version] of Object.entries(dependencies)) {
      if (knownLargePackages.some((pkg) => name.includes(pkg))) {
        largeDependencies.push({ name, version });
      }
    }

    return {
      largeDependencies,
      recommendations:
        largeDependencies.length > 0
          ? [
              "Consider using tree-shaking for MUI components",
              "Use specific icon imports instead of entire icon libraries",
              "Consider using date-fns instead of moment.js",
              "Use lodash-es for better tree-shaking",
            ]
          : [],
    };
  } catch (error) {
    throw new Error(`Bundle analysis failed: ${error.message}`);
  }
}

// Database query analysis
async function analyzeQueries() {
  console.log("   Analyzing database queries...");

  const queryPatterns = [
    {
      pattern: /\.from\([^)]+\)\.select\([^)]+\)(?!.*limit)/g,
      issue: "Missing LIMIT clause",
      severity: "medium",
    },
    {
      pattern: /Promise\.all\s*\(\s*\[[\s\S]*?\]\s*\)/g,
      issue: "Parallel queries found (good)",
      severity: "good",
    },
    {
      pattern: /await\s+supabase[\s\S]*?await\s+supabase/g,
      issue: "Sequential queries detected",
      severity: "high",
    },
    {
      pattern: /\.from\([^)]+\)\.select\(['"]?\*['"]?\)/g,
      issue: "SELECT * queries found",
      severity: "medium",
    },
  ];

  const srcDir = path.join(process.cwd(), "src");
  const issues = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        const content = fs.readFileSync(filePath, "utf8");

        for (const pattern of queryPatterns) {
          const matches = content.match(pattern.pattern);
          if (matches) {
            issues.push({
              file: filePath.replace(process.cwd(), ""),
              issue: pattern.issue,
              severity: pattern.severity,
              matches: matches.length,
            });
          }
        }
      }
    }
  }

  scanDirectory(srcDir);

  return {
    issues,
    recommendations: [
      "Add LIMIT clauses to prevent large result sets",
      "Use parallel queries with Promise.all()",
      "Select only needed columns instead of *",
      "Implement query caching for frequently accessed data",
    ],
  };
}

// Component analysis
async function analyzeComponents() {
  console.log("   Analyzing React components...");

  const componentsDir = path.join(process.cwd(), "src", "components");
  const issues = [];

  if (fs.existsSync(componentsDir)) {
    const components = fs.readdirSync(componentsDir);

    for (const component of components) {
      if (component.endsWith(".tsx")) {
        const filePath = path.join(componentsDir, component);
        const content = fs.readFileSync(filePath, "utf8");

        // Check for optimization opportunities
        const checks = [
          {
            pattern: /export\s+default\s+function/,
            issue: "Not using React.memo",
            severity: "medium",
          },
          {
            pattern: /useEffect\s*\([^,]+,\s*\[\s*\]\s*\)/,
            issue: "Empty dependency array in useEffect",
            severity: "low",
          },
          {
            pattern: /useState\s*\([^)]*\)(?!.*useMemo|.*useCallback)/,
            issue: "Missing useMemo/useCallback optimization",
            severity: "medium",
          },
        ];

        for (const check of checks) {
          if (content.match(check.pattern)) {
            issues.push({
              file: component,
              issue: check.issue,
              severity: check.severity,
            });
          }
        }
      }
    }
  }

  return {
    issues,
    recommendations: [
      "Use React.memo for pure components",
      "Implement useMemo for expensive calculations",
      "Use useCallback for event handlers",
      "Consider lazy loading for heavy components",
    ],
  };
}

// Image optimization analysis
async function analyzeImages() {
  console.log("   Analyzing images...");

  const publicDir = path.join(process.cwd(), "public");
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const images = [];

  if (fs.existsSync(publicDir)) {
    function scanForImages(dir) {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          scanForImages(filePath);
        } else if (
          imageExtensions.some((ext) => file.toLowerCase().endsWith(ext))
        ) {
          images.push({
            file: filePath.replace(process.cwd(), ""),
            size: stat.size,
            sizeKB: Math.round(stat.size / 1024),
          });
        }
      }
    }

    scanForImages(publicDir);
  }

  const largeImages = images.filter((img) => img.size > 100 * 1024); // > 100KB

  return {
    totalImages: images.length,
    largeImages,
    recommendations:
      largeImages.length > 0
        ? [
            "Optimize large images using next/image",
            "Convert PNG to WebP format",
            "Use appropriate image sizes for different devices",
            "Implement lazy loading for images",
          ]
        : [],
  };
}

// Cache analysis
async function analyzeCaching() {
  console.log("   Analyzing caching configuration...");

  const nextConfigPath = path.join(process.cwd(), "next.config.ts");
  const hasNextConfig = fs.existsSync(nextConfigPath);

  let cacheConfig = null;

  if (hasNextConfig) {
    const content = fs.readFileSync(nextConfigPath, "utf8");
    cacheConfig = {
      hasHeaders: content.includes("headers()"),
      hasCompression: content.includes("compress: true"),
      hasImageOptimization: content.includes("images:"),
    };
  }

  return {
    hasNextConfig,
    cacheConfig,
    recommendations: [
      "Implement HTTP cache headers",
      "Enable compression in Next.js config",
      "Set up image optimization",
      "Use SWR or React Query for API caching",
    ],
  };
}

// Set up monitoring
async function setupMonitoring() {
  console.log("   Setting up performance monitoring...");

  const monitoringCode = `
// Performance monitoring utilities
export const perfMonitor = {
  mark: (name: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  },
  
  measure: (name: string, startMark: string, endMark?: string) => {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
        const measures = performance.getEntriesByName(name);
        const duration = measures[measures.length - 1]?.duration || 0;
        
        if (duration > 1000) {
          console.warn(\`Slow operation: \${name} took \${duration.toFixed(2)}ms\`);
        }
        
        return duration;
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
    return 0;
  },
  
  logPageLoad: () => {
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const pageLoadTime = navTiming.loadEventEnd - navTiming.fetchStart;
          
          console.log('Page Performance Metrics:', {
            pageLoadTime: \`\${pageLoadTime.toFixed(2)}ms\`,
            domContentLoaded: \`\${navTiming.domContentLoadedEventEnd - navTiming.fetchStart}ms\`,
            firstByte: \`\${navTiming.responseStart - navTiming.fetchStart}ms\`,
          });
        }, 0);
      });
    }
  },
};
`;

  const monitoringPath = path.join(
    process.cwd(),
    "src",
    "utils",
    "perfMonitor.ts"
  );

  if (config.fix) {
    fs.writeFileSync(monitoringPath, monitoringCode);
    console.log("   Created performance monitoring utility");
  }

  return {
    monitoringSetup: true,
    path: monitoringPath,
  };
}

// Generate recommendations
function generateRecommendations(results) {
  console.log("\n🎯 Performance Optimization Recommendations");
  console.log("==========================================");

  const allRecommendations = [];

  results.forEach((result) => {
    if (result.result && result.result.recommendations) {
      allRecommendations.push(...result.result.recommendations);
    }
  });

  if (allRecommendations.length === 0) {
    console.log("✅ No major performance issues found!");
    return;
  }

  console.log("\nPriority Actions:");
  allRecommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });

  console.log("\nNext Steps:");
  console.log("1. Run with ANALYZE=true to get detailed bundle analysis");
  console.log("2. Run with FIX=true to auto-fix certain issues");
  console.log("3. Implement the query optimization system");
  console.log("4. Add React.memo to large components");
  console.log("5. Set up performance monitoring in production");

  // Create performance optimization checklist
  const checklist = `
# Performance Optimization Checklist

## Database Optimization
- [ ] Add LIMIT clauses to all queries
- [ ] Use parallel queries with Promise.all()
- [ ] Implement query caching
- [ ] Select only needed columns

## Component Optimization
- [ ] Use React.memo for pure components
- [ ] Implement useMemo for expensive calculations
- [ ] Use useCallback for event handlers
- [ ] Add lazy loading for heavy components

## Bundle Optimization
- [ ] Analyze bundle size with webpack-bundle-analyzer
- [ ] Tree-shake unused dependencies
- [ ] Use dynamic imports for route-based code splitting
- [ ] Optimize MUI imports

## Image Optimization
- [ ] Use next/image for all images
- [ ] Convert images to WebP format
- [ ] Implement responsive images
- [ ] Add image lazy loading

## Caching Strategy
- [ ] Set up HTTP cache headers
- [ ] Implement API response caching
- [ ] Use SWR or React Query
- [ ] Cache static assets

## Performance Monitoring
- [ ] Set up performance monitoring
- [ ] Monitor Core Web Vitals
- [ ] Track bundle size over time
- [ ] Monitor database query performance

Generated: ${new Date().toISOString()}
`;

  if (config.fix) {
    fs.writeFileSync(
      path.join(process.cwd(), "PERFORMANCE_CHECKLIST.md"),
      checklist
    );
    console.log("\n📝 Generated PERFORMANCE_CHECKLIST.md");
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, checks };
