
import { createClient } from '@supabase/supabase-js'
import { smartSearchOpportunities, personalizedWebDiscovery, getUserProfile } from '../lib/ai/tools/executors'
import { Database } from '../lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SECRET_KEY!

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey)
const USER_ID = '694725fa-304c-41e4-8015-8e74091a2226'

async function benchmark(name: string, fn: () => Promise<any>, iterations: number = 5) {
    console.log(`\nStarting benchmark: ${name}`)
    const durations: number[] = []

    // Warmup
    try {
        process.stdout.write('Warmup... ')
        await fn()
        console.log('Done.')
    } catch (e) {
        console.error(`Warmup failed: ${e}`)
        return
    }

    for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await fn()
        const end = performance.now()
        durations.push(end - start)
        process.stdout.write(`Run ${i+1}: ${(end - start).toFixed(2)}ms `)
    }

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length
    console.log(`\nAverage: ${avg.toFixed(2)}ms`)
    return avg
}

async function main() {
    console.log('🚀 Starting Performance Benchmark')
    console.log(`Target User: ${USER_ID}`)

    await benchmark('getUserProfile', async () => {
        return await getUserProfile(USER_ID, supabase)
    })

    await benchmark('smartSearchOpportunities', async () => {
        return await smartSearchOpportunities(USER_ID, { query: 'software' }, supabase)
    })

    await benchmark('personalizedWebDiscovery', async () => {
        return await personalizedWebDiscovery(USER_ID, { topic: 'AI' }, supabase)
    })
}

main().catch(console.error)
