// Test SSE stream using native fetch (no dependencies)
const url = 'http://localhost:3000/api/discovery/stream?query=summer+internships';
console.log('Connecting to:', url);

const response = await fetch(url, {
  headers: { 'Accept': 'text/event-stream' }
});

console.log('Status:', response.status);

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
let foundCount = 0;
let currentEventType = null;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEventType = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      const dataStr = line.slice(6);
      try {
        const data = JSON.parse(dataStr);
        const type = data.type || currentEventType;

        if (type === 'opportunity_found') {
          foundCount++;
          console.log('>>> OPPORTUNITY FOUND:', JSON.stringify({
            id: data.id,
            title: data.title,
            similarity: data.similarity,
            source: data.source
          }));
        } else if (type === 'complete' || type === 'done') {
          console.log('>>> COMPLETE. Backend count:', data.count, 'Our foundCount:', foundCount);
          reader.cancel();
          process.exit(0);
        } else if (type === 'layer_start') {
          console.log('Layer start:', data.layer);
        } else if (type === 'layer_complete') {
          console.log('Layer complete:', data.layer, 'items:', data.items?.length || 0);
        } else if (type === 'error') {
          console.log('ERROR:', data.message);
        }
      } catch (e) {
        // not JSON
      }
      currentEventType = null;
    } else if (line === '') {
      currentEventType = null;
    }
  }
}

console.log('Stream ended. foundCount:', foundCount);
