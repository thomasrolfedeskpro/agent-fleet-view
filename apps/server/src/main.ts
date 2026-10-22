import { startServer } from './server.js';
import { PORT } from './types.js';

const server = await startServer({ port: PORT });
console.log(`@fleet/server listening on ${server.url}`);
