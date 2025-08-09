// Enhanced Variable Page Logic for Shared Slug System
// This implements the concept where multiple variables can conceptually share the same slug
// through parent-child relationships

const enhancedFetchDataPoints = `
  const fetchDataPoints = useCallback(async () => {
    if (!user || !variableName || !variableInfo) return;

    try {
      let mappedDataPoints: DataPointEntry[] = [];
      let allRelatedVariables: VariableInfo[] = [variableInfo];

      // 🎯 SHARED SLUG SYSTEM: Get all variables that should be shown on this page
      // This includes the current variable AND its children AND its siblings (same parent)
      
      console.log(\`📊 [Variable Page] Loading data for shared slug: \${variableName}\`);
      console.log(\`📊 [Variable Page] Current variable: \${variableInfo.label} (\${variableInfo.source_type})\`);

      // Get child variables (variables that have this variable as parent)
      const { data: childVariablesData, error: childError } = await supabase
        .from("variables")
        .select("id, label, source_type, slug, description, icon, data_type, category, canonical_unit, is_public, created_at, updated_at, is_active, parent_variable_id")
        .eq("parent_variable_id", variableInfo.id)
        .eq("is_active", true);

      if (!childError && childVariablesData) {
        allRelatedVariables.push(...childVariablesData);
        setChildVariables(childVariablesData);
        console.log(\`�� [Variable Page] Found \${childVariablesData.length} child variables\`);
      }

      // If this variable has a parent, also get sibling variables (same parent)
      if (variableInfo.parent_variable_id) {
        const { data: siblingVariablesData, error: siblingError } = await supabase
          .from("variables")
          .select("id, label, source_type, slug, description, icon, data_type, category, canonical_unit, is_public, created_at, updated_at, is_active, parent_variable_id")
          .eq("parent_variable_id", variableInfo.parent_variable_id)
          .eq("is_active", true)
          .neq("id", variableInfo.id); // Exclude current variable

        if (!siblingError && siblingVariablesData) {
          allRelatedVariables.push(...siblingVariablesData);
          console.log(\`📊 [Variable Page] Found \${siblingVariablesData.length} sibling variables\`);
        }

        // Also get the parent variable
        const { data: parentVariableData, error: parentError } = await supabase
          .from("variables")
          .select("id, label, source_type, slug, description, icon, data_type, category, canonical_unit, is_public, created_at, updated_at, is_active, parent_variable_id")
          .eq("id", variableInfo.parent_variable_id)
          .single();

        if (!parentError && parentVariableData) {
          allRelatedVariables.push(parentVariableData);
          console.log(\`📊 [Variable Page] Found parent variable: \${parentVariableData.label}\`);
        }
      }

      // Remove duplicates and sort by source_type
      const uniqueVariables = allRelatedVariables.filter((v, index, arr) => 
        arr.findIndex(item => item.id === v.id) === index
      ).sort((a, b) => (a.source_type || '').localeCompare(b.source_type || ''));

      console.log(\`📊 [Variable Page] Total variables to fetch data for: \${uniqueVariables.length}\`);
      uniqueVariables.forEach(v => {
        console.log(\`  - \${v.label} (\${v.source_type}) - ID: \${v.id}\`);
      });

      // Fetch data for all related variables
      for (const variable of uniqueVariables) {
        console.log(\`🔍 [Variable Page] Fetching data for: \${variable.label} (\${variable.source_type})\`);

        // Check if this is an Oura variable
        if (variable.source_type === "oura") {
          const { data: ouraLogs, error: ouraError } = await supabase
            .from("oura_variable_data_points")
            .select("id, date, variable_id, value, created_at")
            .eq("user_id", user.id)
            .eq("variable_id", variable.id)
            .order("date", { ascending: false })
            .limit(50);

          if (!ouraError && ouraLogs) {
            const ouraDataPoints = ouraLogs.map((log: any) => ({
              id: log.id,
              date: log.date,
              variable: variable.label,
              value: log.value?.toString() || "0",
              notes: \`Oura Ring data (\${variable.label})\`,
              created_at: log.created_at,
              user_id: user.id,
              variable_id: log.variable_id,
              source: ["oura"],
              source_type: "oura",
              variable_label: variable.label
            }));
            mappedDataPoints.push(...ouraDataPoints);
            console.log(\`  ✅ Found \${ouraLogs.length} Oura data points\`);
          }
        } else if (variable.source_type === "apple_health") {
          // Get Apple Health string ID for this variable
          let appleHealthVariableId = null;
          const appleHealthMapping = {
            'bb4b56d6-02f3-47fe-97fe-b1f1b44e6017': 'steps', // Apple Health Steps
            '89a8bf8c-2b64-4967-8600-d1e2c63670fb': 'heart_rate',
            '4db5c85b-0f41-4eb9-81de-3b57b5dfa198': 'weight'
          };
          
          appleHealthVariableId = appleHealthMapping[variable.id];
          
          if (appleHealthVariableId) {
            const { data: appleHealthLogs, error: appleHealthError } = await supabase
              .from("apple_health_variable_data_points")
              .select("id, date, variable_id, value, created_at")
              .eq("user_id", user.id)
              .eq("variable_id", variable.id) // Now uses UUID
              .order("date", { ascending: false })
              .limit(50);

            if (!appleHealthError && appleHealthLogs) {
              const appleHealthDataPoints = appleHealthLogs.map((log: any) => ({
                id: log.id,
                date: log.date,
                variable: variable.label,
                value: log.value?.toString() || "0",
                notes: \`Apple Health data (\${variable.label})\`,
                created_at: log.created_at,
                user_id: user.id,
                variable_id: log.variable_id,
                source: ["apple_health"],
                source_type: "apple_health",
                variable_label: variable.label
              }));
              mappedDataPoints.push(...appleHealthDataPoints);
              console.log(\`  ✅ Found \${appleHealthLogs.length} Apple Health data points\`);
            }
          }
        } else {
          // Regular variable - fetch from data_points table
          const { data: regularLogs, error: regularError } = await supabase
            .from("data_points")
            .select("id, created_at, date, variable_id, value, notes, user_id, display_unit")
            .eq("user_id", user.id)
            .eq("variable_id", variable.id)
            .order("created_at", { ascending: false })
            .limit(50);

          if (!regularError && regularLogs) {
            const regularDataPoints = regularLogs.map((log: any) => ({
              id: log.id,
              date: log.date || log.created_at?.split('T')[0],
              variable: variable.label,
              value: log.value?.toString() || "0",
              notes: log.notes || \`\${variable.label} data\`,
              created_at: log.created_at,
              user_id: log.user_id,
              variable_id: log.variable_id,
              source: ["manual"],
              source_type: variable.source_type || "manual",
              variable_label: variable.label
            }));
            mappedDataPoints.push(...regularDataPoints);
            console.log(\`  ✅ Found \${regularLogs.length} regular data points\`);
          }
        }
      }

      // Sort all data points by date (newest first)
      mappedDataPoints.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log(\`📊 [Variable Page] Total data points loaded: \${mappedDataPoints.length}\`);
      setDataPoints(mappedDataPoints);

    } catch (error) {
      console.error("Error fetching data points:", error);
      setErrorMessage("Failed to load data points. Please try again.");
      setShowError(true);
    } finally {
      setLoading(false);
    }
  }, [user, variableName, variableInfo, showChildData]);
`;

console.log('✅ Enhanced fetchDataPoints logic created');
console.log('📝 This supports the shared slug system where:');
console.log('  - Multiple variables can conceptually share the same slug');
console.log('  - Parent-child relationships connect related variables');
console.log('  - /steps page shows data from both Apple Health and Oura');
console.log('  - Data points include source_type for filtering');
