
import { createClient } from '@supabase/supabase-js'

async function tryExecSql() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SECRET_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log("Attempting to run SQL via RPC...")
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' })
    if (error) {
        console.error("RPC exec_sql failed:", error)
    } else {
        console.log("RPC exec_sql success!", data)
    }
}

tryExecSql()
