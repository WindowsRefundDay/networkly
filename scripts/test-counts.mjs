// Compare: how many opportunities does the page load vs the backend search?
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://syfukclbwllqfdhhabey.supabase.co";
const SUPABASE_KEY = "sb_publishable_SVkutI5FkQXWHgtoQYSgJQ_rcN7LbLU";
const SCRAPER_URL = "https://networkly-scraper-267103342849.us-central1.run.app";
const API_TOKEN = "Networkly_Scraper_Secure_2026";

// 1) Check Supabase directly (what getOpportunities() returns)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data: allActive, error: err1 } = await supabase
  .from("opportunities")
  .select("id, title, is_active", { count: "exact" })
  .eq("is_active", true);

console.log("=== Supabase: opportunities where is_active=true ===");
console.log("Count:", allActive?.length || 0);
if (err1) console.log("Error:", err1.message);

// Check total (including inactive)
const { count: totalCount, error: err2 } = await supabase
  .from("opportunities")
  .select("id", { count: "exact", head: true });

console.log("\n=== Supabase: ALL opportunities (including inactive) ===");
console.log("Count:", totalCount || 0);
if (err2) console.log("Error:", err2.message);

// Check how many have is_active=false
const { data: inactive, error: err3 } = await supabase
  .from("opportunities")
  .select("id, title, is_active")
  .eq("is_active", false);

console.log("\n=== Supabase: opportunities where is_active=false ===");
console.log("Count:", inactive?.length || 0);

// Check how many have empty/Unknown titles
if (allActive) {
  const badTitles = allActive.filter(
    (o) => !o.title || o.title === "Unknown" || o.title.trim() === ""
  );
  console.log("\n=== Bad titles in active opportunities ===");
  console.log("Count:", badTitles.length);
  if (badTitles.length > 0) {
    console.log("Examples:", badTitles.slice(0, 5).map((o) => ({ id: o.id, title: o.title })));
  }
}

// 2) Check backend search (what /api/v1/search returns)
const searchRes = await fetch(
  `${SCRAPER_URL}/api/v1/search?query=high+school+students&limit=100&threshold=0.3`,
  { headers: { Authorization: `Bearer ${API_TOKEN}` } }
);
const searchData = await searchRes.json();
console.log("\n=== Backend /api/v1/search (broad query, limit=100) ===");
console.log("Count:", searchData.count || searchData.results?.length || 0);

// 3) Cross-reference: are backend search IDs a subset of Supabase active?
if (searchData.results && allActive) {
  const activeIds = new Set(allActive.map((o) => o.id));
  const searchIds = searchData.results.map((r) => r.id);
  const inBoth = searchIds.filter((id) => activeIds.has(id));
  const onlyInSearch = searchIds.filter((id) => !activeIds.has(id));

  console.log("\n=== Cross-reference ===");
  console.log("Search results in Supabase active:", inBoth.length);
  console.log("Search results NOT in Supabase active:", onlyInSearch.length);
  if (onlyInSearch.length > 0) {
    console.log(
      "These IDs exist in backend but NOT in Supabase is_active=true:"
    );
    for (const id of onlyInSearch.slice(0, 5)) {
      const match = searchData.results.find((r) => r.id === id);
      console.log("  -", id, "title:", match?.title);
    }
  }
}

process.exit(0);
