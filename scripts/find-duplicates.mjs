import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://syfukclbwllqfdhhabey.supabase.co";
const SUPABASE_KEY = "sb_publishable_SVkutI5FkQXWHgtoQYSgJQ_rcN7LbLU";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data: all, error } = await supabase
  .from("opportunities")
  .select("id, title, url, is_active, created_at")
  .eq("is_active", true)
  .order("created_at", { ascending: true });

if (error) { console.error("Error:", error.message); process.exit(1); }

console.log(`Total active opportunities: ${all.length}\n`);

// Group by title (case-insensitive, trimmed)
const byTitle = {};
for (const opp of all) {
  const key = (opp.title || "").trim().toLowerCase();
  if (!key || key === "unknown") continue;
  if (!byTitle[key]) byTitle[key] = [];
  byTitle[key].push(opp);
}

const titleDups = Object.entries(byTitle).filter(([, arr]) => arr.length > 1);
console.log(`=== TITLE DUPLICATES: ${titleDups.length} groups ===`);
let totalTitleDups = 0;
for (const [title, arr] of titleDups.sort((a, b) => b[1].length - a[1].length)) {
  totalTitleDups += arr.length - 1;
  console.log(`\n  "${arr[0].title}" (${arr.length} copies):`);
  for (const opp of arr) {
    console.log(`    ID: ${opp.id}  URL: ${(opp.url || "").slice(0, 80)}  Created: ${opp.created_at}`);
  }
}
console.log(`\nTotal duplicate rows (by title): ${totalTitleDups}`);

// Group by URL
const byUrl = {};
for (const opp of all) {
  const key = (opp.url || "").trim().toLowerCase();
  if (!key) continue;
  if (!byUrl[key]) byUrl[key] = [];
  byUrl[key].push(opp);
}

const urlDups = Object.entries(byUrl).filter(([, arr]) => arr.length > 1);
console.log(`\n\n=== URL DUPLICATES: ${urlDups.length} groups ===`);
let totalUrlDups = 0;
for (const [url, arr] of urlDups.sort((a, b) => b[1].length - a[1].length)) {
  totalUrlDups += arr.length - 1;
  console.log(`\n  URL: ${url.slice(0, 100)}`);
  for (const opp of arr) {
    console.log(`    ID: ${opp.id}  Title: "${opp.title}"  Created: ${opp.created_at}`);
  }
}
console.log(`\nTotal duplicate rows (by URL): ${totalUrlDups}`);

// Summary
const uniqueTitles = Object.keys(byTitle).length;
console.log(`\n\n=== SUMMARY ===`);
console.log(`Active rows: ${all.length}`);
console.log(`Unique titles: ${uniqueTitles}`);
console.log(`Duplicate title groups: ${titleDups.length}`);
console.log(`Extra rows to remove (by title): ${totalTitleDups}`);
console.log(`Duplicate URL groups: ${urlDups.length}`);
console.log(`Extra rows to remove (by URL): ${totalUrlDups}`);

// Collect IDs to delete — keep the oldest (first created) in each group, delete the rest
const idsToDelete = new Set();
for (const [, arr] of titleDups) {
  // Keep the first (oldest), mark rest for deletion
  for (let i = 1; i < arr.length; i++) {
    idsToDelete.add(arr[i].id);
  }
}
// Also handle URL dups not caught by title
for (const [, arr] of urlDups) {
  for (let i = 1; i < arr.length; i++) {
    idsToDelete.add(arr[i].id);
  }
}

console.log(`\nTotal IDs to delete (union of title+URL dups): ${idsToDelete.size}`);
if (idsToDelete.size > 0) {
  console.log("\nIDs to delete:");
  for (const id of idsToDelete) {
    console.log(`  ${id}`);
  }
}

process.exit(0);
