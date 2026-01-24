import { createClient } from '@supabase/supabase-js'
import { allOpportunities } from '../lib/mock-data'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
})

async function main() {
    console.log('🌱 Starting opportunities seed...')

    // Check existing count
    const { count: existingCount } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })

    console.log(`📊 Found ${existingCount || 0} existing opportunities (will not be deleted)`)

    console.log('💼 Upserting mock opportunities...')
    const opportunitiesData = allOpportunities.map((opp) => ({
        id: opp.id,
        url: `https://example.com/opportunity/${opp.id}`,
        title: opp.title,
        company: opp.company,
        location: opp.location,
        type: opp.type,
        category: 'Other',
        deadline: new Date(opp.deadline).toISOString(),
        logo: opp.logo,
        skills: opp.skills,
        description: opp.description,
        salary: opp.salary,
        duration: opp.duration,
        location_type: opp.remote ? 'Remote' : 'In-Person',
        applicants: opp.applicants,
        extraction_confidence: 1.0,
        is_active: true,
    }))

    // Use upsert to avoid duplicates without deleting existing ones
    const { error: opportunitiesError } = await supabase
        .from('opportunities')
        .upsert(opportunitiesData, { onConflict: 'id' })

    if (opportunitiesError) {
        console.error('Error upserting opportunities:', opportunitiesError)
        throw opportunitiesError
    }

    console.log(`  ✓ Upserted ${allOpportunities.length} mock opportunities`)
    console.log('\n✅ Opportunities seed completed successfully!')
    console.log(`   Your ${existingCount || 0} existing opportunities are safe! 🎉`)
}

main()
    .catch((e) => {
        console.error('❌ Error seeding opportunities:', e)
        process.exit(1)
    })
