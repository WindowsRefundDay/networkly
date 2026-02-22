import { createClient as createSupabaseClient } from '@supabase/supabase-js'

async function checkSchema() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SECRET_KEY!
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

    console.log("Checking schema for 'opportunities' table...")
    const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'opportunities' })
    if (error) {
        console.log("Could not use RPC, trying direct select...")
        const { data: cols, error: colError } = await supabase.from('opportunities').select().limit(1)
        if (colError) {
            console.error("Error fetching opportunities:", colError)
        } else {
            console.log("Columns found in opportunities:", Object.keys(cols[0] || {}))
        }
    } else {
        console.log("Opportunities schema:", data)
    }

    console.log("\nChecking schema for 'users' table...")
    const { data: userCols, error: userColError } = await supabase.from('users').select().limit(1)
    if (userColError) {
        console.error("Error fetching users:", userColError)
    } else {
        console.log("Columns found in users:", Object.keys(userCols[0] || {}))
    }

    console.log("\nChecking schema for 'projects' table...")
    const { data: projectCols, error: projectColError } = await supabase.from('projects').select().limit(1)
    if (projectColError) {
        console.error("Error fetching projects:", projectColError)
    } else {
        console.log("Columns found in projects:", Object.keys(projectCols[0] || {}))
    }

    console.log("\nChecking schema for 'events' table...")
    const { data: eventCols, error: eventColError } = await supabase.from('events').select().limit(1)
    if (eventColError) {
        console.error("Error fetching events:", eventColError)
    } else {
        console.log("Columns found in events:", Object.keys(eventCols[0] || {}))
    }
}

checkSchema()
