import { createClient } from "@supabase/supabase-js"

import { allOpportunities } from "@/lib/mock-data"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set")
}

const supabase = createClient(supabaseUrl, supabaseKey)

function parseDeadline(deadline: string | undefined) {
  if (!deadline) return null
  const parsed = new Date(deadline)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

async function main() {
  console.log("🌱 Initializing opportunities...")

  for (const opp of allOpportunities) {
    const deadline = parseDeadline(opp.deadline)
    const fallbackUrl = `https://example.com/opportunity/${opp.id}`
    const now = new Date().toISOString()

    const opportunityData = {
      id: opp.id,
      title: opp.title,
      company: opp.company,
      location: opp.location,
      type: opp.type,
      category: "Other",
      deadline,
      logo: opp.logo,
      skills: opp.skills || [],
      description: opp.description,
      salary: opp.salary,
      duration: opp.duration,
      remote: opp.remote,
      applicants: opp.applicants || 0,
      extraction_confidence: 1.0,
      is_active: true,
      url: fallbackUrl,
      source_url: fallbackUrl,
      posted_date: now,
      created_at: now,
      updated_at: now,
    }

    // Upsert using Supabase
    const { error } = await supabase
      .from("opportunities")
      .upsert(opportunityData, { onConflict: "id" })

    if (error) {
      console.error(`❌ Failed to upsert ${opp.id}:`, error.message)
    }
  }

  console.log(`✅ Upserted ${allOpportunities.length} opportunities.`)
}

main()
  .catch((error) => {
    console.error("❌ Failed to initialize opportunities:", error)
    process.exit(1)
  })
