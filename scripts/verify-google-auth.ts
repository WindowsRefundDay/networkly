
import { GoogleModelManager } from '../lib/ai/google-model-manager'

console.log("--- Starting GoogleModelManager verification ---")

async function runTests() {
    // 1. Vertex AI + JSON
    try {
        console.log("\n1. Testing Vertex AI with JSON credentials...")
        const validJson = JSON.stringify({ client_email: 'test@example.com', private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZ...\n-----END PRIVATE KEY-----' })
        // Use a distinct project ID to verify it's using the config
        const m1 = new GoogleModelManager({ project: 'test-project-1', credentialsJson: validJson, apiKey: undefined })
        console.log("✅ Vertex AI + JSON initialized successfully")
    } catch (e) {
        console.error("❌ Vertex AI + JSON failed:", e)
        process.exit(1)
    }

    // 2. Vertex AI + ADC
    try {
        console.log("\n2. Testing Vertex AI with ADC (no JSON)...")
        const m2 = new GoogleModelManager({ project: 'test-project-2', credentialsJson: undefined, apiKey: undefined })
        console.log("✅ Vertex AI + ADC initialized successfully")
    } catch (e) {
        console.error("❌ Vertex AI + ADC failed:", e)
        process.exit(1)
    }

    // 3. Google AI (API Key) - need to ensure project is NOT used
    try {
        console.log("\n3. Testing Google AI (API Key)...")

        // Save original env
        const originalProject = process.env.GOOGLE_VERTEX_PROJECT

        // Unset env var temporarily to force fallback
        delete process.env.GOOGLE_VERTEX_PROJECT

        // Pass project: undefined explicitly (though constructor logic uses env if undefined, but env is now deleted)
        const m3 = new GoogleModelManager({ apiKey: 'test-key', project: undefined })

        // Restore env
        if (originalProject) process.env.GOOGLE_VERTEX_PROJECT = originalProject

        console.log("✅ Google AI (API Key) initialized successfully")
    } catch (e) {
        console.error("❌ Google AI (API Key) failed:", e)
        process.exit(1)
    }
}

runTests().then(() => {
    console.log("\n--- Verification Complete ---")
}).catch(e => {
    console.error("Unexpected error:", e)
    process.exit(1)
})
