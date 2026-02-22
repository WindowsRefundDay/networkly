// Full end-to-end discovery simulation: fast search + SSE stream in parallel
const query = "summer internships";
const seenIds = new Set();
let fastResults = 0;
let streamResults = 0;

console.log("=== SIMULATING BROWSER DISCOVERY FLOW ===");
console.log("Query:", query);
console.log("");

// 1) FAST PATH: /api/discovery/search
console.log("--- FAST PATH: /api/discovery/search ---");
const searchStart = Date.now();
const searchRes = await fetch("http://localhost:3000/api/discovery/search?query=" + encodeURIComponent(query) + "&limit=15&threshold=0.6");
const searchData = await searchRes.json();
const results = searchData.results || [];

for (const r of results) {
  if (r.title === "Unknown" || (r.title && r.title.trim() === "")) continue;
  if (r.title) {
    seenIds.add(r.id);
    fastResults++;
    console.log("  [FAST] " + r.title.substring(0, 60) + " (sim=" + (r.similarity || 0).toFixed(2) + ")");
  }
}
console.log("Fast search: " + fastResults + " results in " + (Date.now() - searchStart) + "ms");
console.log("");

// 2) SLOW PATH: SSE stream
console.log("--- SLOW PATH: SSE Stream ---");
const streamStart = Date.now();
const ac = new AbortController();
setTimeout(() => { ac.abort(); }, 55000);

try {
  const streamRes = await fetch("http://localhost:3000/api/discovery/stream?query=" + encodeURIComponent(query), {
    headers: { "Accept": "text/event-stream" },
    signal: ac.signal
  });

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = null;
  let looping = true;

  while (looping) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ") && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6));
          if (currentEvent === "opportunity_found") {
            if (data.id && seenIds.has(data.id)) {
              console.log("  [STREAM] SKIPPED (dup): " + (data.title || "?").substring(0, 50));
            } else {
              if (data.id) seenIds.add(data.id);
              streamResults++;
              console.log("  [STREAM] NEW: " + (data.title || "?").substring(0, 50) + " (src=" + (data.source || "?") + ")");
            }
          } else if (currentEvent === "complete" || currentEvent === "done") {
            console.log("  [STREAM] Complete in " + (Date.now() - streamStart) + "ms");
            reader.cancel();
            looping = false;
            break;
          }
        } catch (e) {
          // skip parse errors
        }
        currentEvent = null;
      }
    }
  }
} catch (e) {
  if (e.name === "AbortError") {
    console.log("  [STREAM] Timed out after 55s");
  } else {
    console.log("  [STREAM] Error:", e.message);
  }
}

console.log("");
console.log("=== SUMMARY ===");
console.log("Fast search results: " + fastResults);
console.log("Stream new results:  " + streamResults);
console.log("Total unique:        " + seenIds.size);
console.log("");
console.log("USER WOULD SEE: " + seenIds.size + " opportunities in their UI");
process.exit(0);
