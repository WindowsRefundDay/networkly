// Test the matching algorithm against real opportunities
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://syfukclbwllqfdhhabey.supabase.co";
const SUPABASE_KEY = "sb_publishable_SVkutI5FkQXWHgtoQYSgJQ_rcN7LbLU";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Simulate a user profile interested in cardiology/medicine
const testProfile = {
  interests: ["cardiology", "medicine", "biology", "healthcare"],
  career_goals: "I want to become a cardiologist and conduct research in cardiovascular medicine",
  preferred_opportunity_types: ["internship", "research"],
  academic_strengths: ["biology", "chemistry", "anatomy"],
  grade_level: 11,
  location: null,
  availability: null,
};

// Fetch all active opportunities
const { data: opportunities, error } = await supabase
  .from("opportunities")
  .select("*")
  .eq("is_active", true)
  .neq("title", "Unknown");

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log("Total active opportunities:", opportunities.length);
console.log("");
console.log("Test profile:");
console.log("  Interests:", testProfile.interests.join(", "));
console.log("  Career goals:", testProfile.career_goals);
console.log("  Preferred types:", testProfile.preferred_opportunity_types.join(", "));
console.log("  Academic strengths:", testProfile.academic_strengths.join(", "));
console.log("  Grade level:", testProfile.grade_level);
console.log("");

// Run the same scoring algorithm
function scoreOpportunity(opp, profile) {
  let score = 0;
  const reasons = [];

  const oppTitle = (opp.title || "").toLowerCase();
  const oppDesc = (opp.description || "").toLowerCase();
  const oppCategory = (opp.category || "").toLowerCase();
  const oppCompany = (opp.company || "").toLowerCase();
  const oppSkills = (opp.skills || []).map((s) => s.toLowerCase());
  const oppType = (opp.type || "").toLowerCase();
  const oppText = `${oppTitle} ${oppDesc} ${oppCategory} ${oppCompany} ${oppSkills.join(" ")}`;

  // 1) Interest match (up to 35)
  if (profile.interests && profile.interests.length > 0) {
    let interestHits = 0;
    const matched = [];
    for (const interest of profile.interests) {
      const lower = interest.toLowerCase();
      if (oppText.includes(lower)) {
        interestHits++;
        matched.push(interest);
      } else {
        const words = lower.split(/\s+/).filter((w) => w.length > 3);
        for (const word of words) {
          if (oppText.includes(word)) {
            interestHits += 0.5;
            matched.push(interest);
            break;
          }
        }
      }
    }
    const interestScore = Math.min(35, Math.round((interestHits / profile.interests.length) * 35));
    score += interestScore;
    if (matched.length > 0) reasons.push(`Interest: ${[...new Set(matched)].join(", ")}`);
  }

  // 2) Career goal match (up to 20)
  if (profile.career_goals) {
    const goalWords = profile.career_goals
      .toLowerCase()
      .split(/[\s,;.]+/)
      .filter((w) => w.length > 3)
      .filter((w) => !["want", "become", "like", "would", "with", "that", "this", "have", "from", "been", "into", "more", "some"].includes(w));

    let goalHits = 0;
    for (const word of goalWords) {
      if (oppText.includes(word)) goalHits++;
    }
    if (goalWords.length > 0) {
      score += Math.min(20, Math.round((goalHits / goalWords.length) * 20));
      if (goalHits > 0) reasons.push("Career goals");
    }
  }

  // 3) Type preference (up to 15)
  if (profile.preferred_opportunity_types && profile.preferred_opportunity_types.length > 0) {
    const prefTypes = profile.preferred_opportunity_types.map((t) => t.toLowerCase());
    if (prefTypes.includes(oppType) || prefTypes.some((t) => oppType.includes(t) || t.includes(oppType))) {
      score += 15;
      reasons.push(`Type: ${opp.type}`);
    }
  }

  // 4) Academic strength (up to 15)
  if (profile.academic_strengths && profile.academic_strengths.length > 0) {
    let strengthHits = 0;
    const matched = [];
    for (const strength of profile.academic_strengths) {
      const lower = strength.toLowerCase();
      if (oppSkills.some((s) => s.includes(lower) || lower.includes(s))) {
        strengthHits++;
        matched.push(strength);
      } else if (oppText.includes(lower)) {
        strengthHits += 0.5;
        matched.push(strength);
      }
    }
    score += Math.min(15, Math.round((strengthHits / profile.academic_strengths.length) * 15));
    if (matched.length > 0) reasons.push(`Strengths: ${[...new Set(matched)].join(", ")}`);
  }

  // 5) Grade level (up to 10)
  if (profile.grade_level && opp.grade_levels && opp.grade_levels.length > 0) {
    if (opp.grade_levels.includes(profile.grade_level)) {
      score += 10;
      reasons.push("Grade fit");
    }
  } else if (profile.grade_level && (!opp.grade_levels || opp.grade_levels.length === 0)) {
    score += 5;
  }

  // 6) Base
  score += 5;

  return { score: Math.min(100, score), reasons };
}

// Score all
const scored = opportunities
  .map((opp) => {
    const { score, reasons } = scoreOpportunity(opp, testProfile);
    return { title: opp.title, type: opp.type, category: opp.category, score, reasons };
  })
  .sort((a, b) => b.score - a.score);

// Show results
const minScore = 20;
const matched = scored.filter((s) => s.score >= minScore);
const filtered = scored.filter((s) => s.score < minScore);

console.log(`=== MATCHED (score >= ${minScore}): ${matched.length} opportunities ===`);
for (const item of matched) {
  console.log(`  [${item.score}] ${item.title.substring(0, 55).padEnd(55)} | ${item.type.padEnd(12)} | ${item.reasons.join(", ")}`);
}

console.log("");
console.log(`=== FILTERED OUT (score < ${minScore}): ${filtered.length} opportunities ===`);
for (const item of filtered.slice(0, 10)) {
  console.log(`  [${item.score}] ${item.title.substring(0, 55).padEnd(55)} | ${item.type.padEnd(12)} | ${item.reasons.join(", ") || "no match"}`);
}
if (filtered.length > 10) {
  console.log(`  ... and ${filtered.length - 10} more`);
}

console.log("");
console.log(`SUMMARY: ${matched.length} shown / ${filtered.length} hidden / ${opportunities.length} total`);
process.exit(0);
