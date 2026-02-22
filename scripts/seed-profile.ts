import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

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

// Helper to load env vars from .env file
function loadEnvFromFile(envPath: string): Record<string, string> {
    try {
        const content = readFileSync(envPath, 'utf-8')
        const env: Record<string, string> = {}
        for (const line of content.split('\n')) {
            const trimmed = line.trim()
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [key, ...valueParts] = trimmed.split('=')
                const value = valueParts.join('=').replace(/^["']|["']$/g, '')
                env[key.trim()] = value.trim()
            }
        }
        return env
    } catch {
        return {}
    }
}

async function main() {
    console.log('🌱 Starting user profile seed...\n')

    // Get user_id from command line args or use first user
    const userIdArg = process.argv[2]
    
    let userId: string | null = null

    if (userIdArg) {
        // Use provided user_id
        userId = userIdArg
        console.log(`📋 Using provided user_id: ${userId}`)
    } else {
        // Get first user from users table
        console.log('🔍 Finding first user from users table...')
        const { data: users, error: listError } = await supabase
            .from('users')
            .select('id, email, name')
            .limit(1)
        
        if (listError) {
            console.error('❌ Error listing users:', listError)
            throw listError
        }

        if (!users || users.length === 0) {
            console.error('❌ No users found in users table')
            console.log('\n💡 Options:')
            console.log('   1. Sign up/login first to create a user')
            console.log('   2. Run: pnpm db:seed-profile <user_id>')
            console.log('   3. Run: pnpm db:create-profile (if logged in)')
            process.exit(1)
        }

        userId = users[0].id
        console.log(`✓ Found user: ${users[0].email || users[0].name} (${userId})`)
    }

    // Check if user exists in users table
    const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', userId)
        .single()

    if (userError || !userRecord) {
        console.error(`❌ User ${userId} not found in users table`)
        console.log('\n💡 Make sure the user exists in auth.users and users table first')
        process.exit(1)
    }

    console.log(`✓ User found in users table: ${userRecord.email || userRecord.name}`)

    // Check if profile already exists
    const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

    if (existingProfile) {
        console.log('⚠️  Profile already exists. Updating...')
    } else {
        console.log('📝 Creating new profile...')
    }

    // Sample profile data - customize as needed
    const profileData = {
        user_id: userId,
        interests: ['AI/ML', 'Web Development', 'Research'],
        location: 'San Francisco, CA',
        school: 'High School',
        grade_level: 11,
        career_goals: 'Become a software engineer working on AI products',
        preferred_opportunity_types: ['Internship', 'Research Program', 'Competition'],
        academic_strengths: ['Mathematics', 'Computer Science', 'Physics'],
        availability: 'Summer',
    }

    // Upsert profile
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single()

    if (profileError) {
        console.error('❌ Error upserting profile:', profileError)
        throw profileError
    }

    console.log('\n✅ Profile seed completed successfully!')
    console.log('\n📊 Profile data:')
    console.log(`   User ID: ${profile.user_id}`)
    console.log(`   Interests: ${profile.interests.join(', ')}`)
    console.log(`   Location: ${profile.location}`)
    console.log(`   School: ${profile.school}`)
    console.log(`   Grade Level: ${profile.grade_level}`)
    console.log(`   Career Goals: ${profile.career_goals}`)
    console.log(`   Preferred Types: ${profile.preferred_opportunity_types.join(', ')}`)
    console.log(`   Academic Strengths: ${profile.academic_strengths.join(', ')}`)
    console.log(`   Availability: ${profile.availability}`)
    console.log('\n💡 You can now test personalized discovery in the opportunities page!')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding profile:', e)
        process.exit(1)
    })
