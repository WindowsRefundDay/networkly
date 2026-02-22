
import { triggerDiscovery } from '../app/actions/discovery'

async function test() {
    process.env.SCRAPER_API_URL = "https://networkly-scraper-267103342849.us-central1.run.app";
    // process.env.DISCOVERY_API_TOKEN = "..."; // I don't know this yet

    console.log("Testing triggerDiscovery with 'robotics internships'...")
    const result = await triggerDiscovery("robotics internships")
    console.log(JSON.stringify(result, null, 2))
}

test()
