import { PORT, CORS_HEADERS } from './config.js';
import { handleHealth } from './routes/health.js';
import { handleRadar } from './routes/radar.js';
import { loadCSV } from './data/csvHandler.js';

// Load CSV data on startup
console.log('📊 Loading CSV data...');
loadCSV();

const server = Bun.serve({
  port: PORT,

  fetch(req) {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Route handlers
    if (url.pathname === "/health") {
      return handleHealth();
    }

    if (url.pathname === "/radar") {
      return handleRadar();
    }

    // 404 for other routes
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🎯 Radar server running on http://localhost:${server.port}`);
console.log(`   Health endpoint: http://localhost:${server.port}/health`);
console.log(`   Radar endpoint:  http://localhost:${server.port}/radar`);
