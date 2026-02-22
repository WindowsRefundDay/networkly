// Check for duplicate opportunities in the Supabase database
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://syfukclbwllqfdhhabey.supabase.co";
const SUPABASE_KEY = "sb_publishable_SVkutI5FkQXWHgtoQYSgJQ_rcN7LbLU";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fetch all active opportunities
const { data: opportunities, error } = await supabase
  .from("opportunities")
  .select("id, title, url, company, type, category, created_at")
  .eq("is_active", true);

if (error) {
  console.error("Error fetching opportunities:", error.message);
  process.exit(1);
}

console.log(`Total active opportunities fetched: ${opportunities.length}`);
console.log("=".repeat(80));

// ─── Group by title (case-insensitive) ───
const titleGroups = new Map();
for (const opp of opportunities) {
  const key = (opp.title || "").trim().toLowerCase();
  if (!titleGroups.has(key)) {
    titleGroups.set(key, []);
  }
  titleGroups.get(key).push(opp);
}

const titleDuplicates = [...titleGroups.entries()]
  .filter(([, group]) => group.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

const uniqueTitles = [...titleGroups.entries()].filter(([, group]) => group.length === 1);

console.log("");
console.log("=== TITLE DUPLICATES (case-insensitive) ===");
console.log(`Unique titles: ${uniqueTitles.length}`);
console.log(`Duplicate title groups: ${titleDuplicates.length}`);
console.log(`Total rows involved in title duplicates: ${titleDuplicates.reduce((sum, [, g]) => sum + g.length, 0)}`);
console.log("");

for (const [title, group] of titleDuplicates) {
  console.log(`  [${group.length}x] "${group[0].title}"`);
  for (const opp of group) {
    const url = opp.url ? opp.url.substring(0, 60) : "(no url)";
    const created = opp.created_at ? opp.created_at.substring(0, 10) : "n/a";
    console.log(`       ID: ${opp.id}  |  URL: ${url}  |  Created: ${created}`);
  }
  console.log("");
}

// ─── Group by URL ───
const urlGroups = new Map();
for (const opp of opportunities) {
  const rawUrl = (opp.url || "").trim().toLowerCase();
  if (!rawUrl || rawUrl === "" || rawUrl === "null") continue; // skip entries with no URL
  // Normalize: remove trailing slash, remove protocol differences
  const key = rawUrl.replace(/\/+$/, "").replace(/^https?:\/\//, "");
  if (!urlGroups.has(key)) {
    urlGroups.set(key, []);
  }
  urlGroups.get(key).push(opp);
}

const urlDuplicates = [...urlGroups.entries()]
  .filter(([, group]) => group.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

const uniqueUrls = [...urlGroups.entries()].filter(([, group]) => group.length === 1);
const noUrlCount = opportunities.filter((o) => !o.url || o.url.trim() === "" || o.url.trim().toLowerCase() === "null").length;

console.log("=== URL DUPLICATES (normalized, case-insensitive) ===");
console.log(`Unique URLs: ${uniqueUrls.length}`);
console.log(`Duplicate URL groups: ${urlDuplicates.length}`);
console.log(`Total rows involved in URL duplicates: ${urlDuplicates.reduce((sum, [, g]) => sum + g.length, 0)}`);
console.log(`Entries with no URL: ${noUrlCount}`);
console.log("");

for (const [url, group] of urlDuplicates) {
  console.log(`  [${group.length}x] ${url.substring(0, 70)}`);
  for (const opp of group) {
    const created = opp.created_at ? opp.created_at.substring(0, 10) : "n/a";
    console.log(`       ID: ${opp.id}  |  Title: ${(opp.title || "").substring(0, 50)}  |  Created: ${created}`);
  }
  console.log("");
}

// ─── Summary ───
console.log("=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log(`Total active opportunities: ${opportunities.length}`);
console.log(`Unique titles:              ${uniqueTitles.length}`);
console.log(`Duplicate title groups:     ${titleDuplicates.length} (${titleDuplicates.reduce((sum, [, g]) => sum + g.length, 0)} rows)`);
console.log(`Unique URLs:                ${uniqueUrls.length}`);
console.log(`Duplicate URL groups:       ${urlDuplicates.length} (${urlDuplicates.reduce((sum, [, g]) => sum + g.length, 0)} rows)`);
console.log(`No-URL entries:             ${noUrlCount}`);

// Extra rows that could be removed (keep 1 per group)
const titleExtraRows = titleDuplicates.reduce((sum, [, g]) => sum + g.length - 1, 0);
const urlExtraRows = urlDuplicates.reduce((sum, [, g]) => sum + g.length - 1, 0);
console.log("");
console.log(`Potential removable rows (title dupes, keep 1 each): ${titleExtraRows}`);
console.log(`Potential removable rows (URL dupes, keep 1 each):   ${urlExtraRows}`);

process.exit(0);
