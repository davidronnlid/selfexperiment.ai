const { createClient } = require("@supabase/supabase-js");

console.log("🔧 Oura Variable Update Script\n");

// Load environment variables
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  console.log(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOuraVariables() {
  console.log("🔍 Checking current Oura variables...\n");

  try {
    // Check variables with "oura" or "Oura" in label
    const { data: ouraLabelVars, error: labelError } = await supabase
      .from("variables")
      .select("id, slug, label, source_type, category")
      .or("label.ilike.oura%,label.ilike.Oura%")
      .order("label");

    if (labelError) {
      console.error(
        "❌ Error fetching variables with Oura labels:",
        labelError
      );
      return;
    }

    console.log(
      `📊 Found ${ouraLabelVars.length} variables with "oura" or "Oura" in label:`
    );
    ouraLabelVars.forEach((v) => {
      console.log(`  • ${v.label} (slug: ${v.slug}, source: ${v.source_type})`);
    });

    // Check variables with source_type = 'oura'
    const { data: ouraSourceVars, error: sourceError } = await supabase
      .from("variables")
      .select("id, slug, label, source_type, category")
      .eq("source_type", "oura")
      .order("label");

    if (sourceError) {
      console.error("❌ Error fetching Oura source variables:", sourceError);
      return;
    }

    console.log(
      `\n📊 Found ${ouraSourceVars.length} variables with source_type = 'oura':`
    );
    ouraSourceVars.forEach((v) => {
      console.log(`  • ${v.label} (slug: ${v.slug})`);
    });

    // Check variables with slug starting with 'oura_'
    const { data: ouraSlugVars, error: slugError } = await supabase
      .from("variables")
      .select("id, slug, label, source_type, category")
      .like("slug", "oura_%")
      .order("slug");

    if (slugError) {
      console.error("❌ Error fetching variables with oura_ slugs:", slugError);
      return;
    }

    console.log(
      `\n📊 Found ${ouraSlugVars.length} variables with slug starting with 'oura_':`
    );
    ouraSlugVars.forEach((v) => {
      console.log(`  • ${v.slug} (label: ${v.label})`);
    });

    console.log("\n✅ Check complete!");
    console.log("\n📝 To update these variables, run the SQL script:");
    console.log("   scripts/update_oura_variables_safe.sql");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

// Run the check
checkOuraVariables();
