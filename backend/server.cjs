// Passenger / LiteSpeed entry point (CommonJS). The real server is ESM, so load it dynamically.
import('./server.mjs').catch((e) => { console.error(e); process.exit(1); });
