// Simple static file server for the frontend
const server = Bun.serve({
  port: 8000,

  async fetch(req) {
    const url = new URL(req.url);
    let filePath = url.pathname;

    // Default to index.html
    if (filePath === '/') {
      filePath = '/index.html';
    }

    try {
      // Serve files from current directory
      const file = Bun.file('.' + filePath);
      return new Response(file);
    } catch (error) {
      return new Response('Not Found', { status: 404 });
    }
  },
});

console.log(`🌐 Frontend server running on http://localhost:${server.port}`);
console.log(`   Open http://localhost:${server.port} in your browser`);
