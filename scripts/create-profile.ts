/**
 * Simple script to create/update a user profile for the current authenticated user.
 * 
 * Usage:
 *   1. Make sure you're logged in to the app
 *   2. Run: pnpm db:create-profile
 * 
 * Or use the seed script with a user_id:
 *   pnpm db:seed-profile <user_id>
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

// Note: This script requires you to be authenticated
// For server-side seeding, use seed-profile.ts instead
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
    console.log('🌱 Creating user profile...\n')

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error('❌ Not authenticated. Please log in first.')
        console.log('\n💡 Alternative: Use the seed script with a user_id:')
        console.log('   pnpm db:seed-profile <user_id>')
        process.exit(1)
    }

    console.log(`✓ Authenticated as: ${user.email}`)

    // Check if user exists in users table
    const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', user.id)
        .single()

    if (userError || !userRecord) {
        console.error(`❌ User ${user.id} not found in users table`)
        console.log('\n💡 Make sure the user record exists first')
        process.exit(1)
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (existingProfile) {
        console.log('⚠️  Profile already exists. Updating...')
    } else {
        console.log('📝 Creating new profile...')
    }

    // Sample profile data - customize as needed
    const profileData = {
        user_id: user.id,
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

    console.log('\n✅ Profile created/updated successfully!')
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
        console.error('❌ Error creating profile:', e)
        process.exit(1)
    })
