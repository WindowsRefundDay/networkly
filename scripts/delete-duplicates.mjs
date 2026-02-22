import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://syfukclbwllqfdhhabey.supabase.co";
// Use service role key to bypass RLS
const SUPABASE_KEY = "sb_secret_BMdCEvXA0wLVNlHRGtyhMA_b8CM1GvI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// First, find all duplicates dynamically (don't hardcode IDs)
const { data: all, error: fetchErr } = await supabase
  .from("opportunities")
  .select("id, title, url, is_active, created_at")
  .eq("is_active", true)
  .order("created_at", { ascending: true });

if (fetchErr) { console.error("Fetch error:", fetchErr.message); process.exit(1); }
console.log(`Total active opportunities: ${all.length}`);

// Group by title (case-insensitive)
const byTitle = {};
for (const opp of all) {
  const key = (opp.title || "").trim().toLowerCase();
  if (!key || key === "unknown") continue;
  if (!byTitle[key]) byTitle[key] = [];
  byTitle[key].push(opp);
}

const titleDups = Object.entries(byTitle).filter(([, arr]) => arr.length > 1);
console.log(`Found ${titleDups.length} duplicate title groups\n`);

// Collect IDs to delete — keep the oldest, delete the rest
const idsToDelete = [];
for (const [, arr] of titleDups) {
  console.log(`"${arr[0].title}" — keeping ${arr[0].id}, deleting ${arr.length - 1} dupes`);
  for (let i = 1; i < arr.length; i++) {
    idsToDelete.push(arr[i].id);
  }
}

if (idsToDelete.length === 0) {
  console.log("\nNo duplicates to delete!");
  process.exit(0);
}

console.log(`\nDeleting ${idsToDelete.length} duplicate rows...`);

const { error: delErr, count } = await supabase
  .from("opportunities")
  .delete()
  .in("id", idsToDelete);

if (delErr) {
  console.error(`Delete error: ${delErr.message}`);
} else {
  console.log(`Deleted successfully.`);
}

// Verify
const { data: remaining } = await supabase
  .from("opportunities")
  .select("id, title")
  .eq("is_active", true);

console.log(`\nRemaining active opportunities: ${remaining?.length || 0}`);

// Verify no more dups
const byTitle2 = {};
for (const opp of remaining || []) {
  const key = (opp.title || "").trim().toLowerCase();
  if (!key || key === "unknown") continue;
  if (!byTitle2[key]) byTitle2[key] = [];
  byTitle2[key].push(opp);
}
const dupsLeft = Object.entries(byTitle2).filter(([, arr]) => arr.length > 1);
console.log(`Remaining title duplicates: ${dupsLeft.length}`);
if (dupsLeft.length > 0) {
  for (const [, arr] of dupsLeft) {
    console.log(`  "${arr[0].title}" — ${arr.length} copies`);
  }
}

process.exit(0);
