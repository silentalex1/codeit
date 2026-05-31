import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/serve-static';
import { chatRoutes } from './routes/chat';
import { preloadModel } from './ai/ollama'; // preload the embedded phi-3-mini early
import { readFileSync } from 'fs';
import { join } from 'path';

const app = new Hono();

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.use('*', logger());
app.use('/api/*', cors());

// Also allow CORS on the PrysmisAI OpenAI-compatible routes for extensions
app.use('/prysmisai/*', cors());

app.use('/static/*', serveStatic({ root: './public' }));
app.use('/generated/*', serveStatic({ root: './' }));

app.route('/api', chatRoutes);

// Mount PrysmisAI OpenAI-compatible routes at root level for clean paths
// Example usage: http://localhost:3000/prysmisai/v1/chat/completions
app.route('/', chatRoutes);

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'PrysmisAI',
  });
});

app.get('/dashboard/platform', (c) => {
  try {
    const html = readFileSync(join(process.cwd(), 'public', 'dashboard', 'platform.html'), 'utf-8');
    return c.html(html);
  } catch {
    return c.html('<h1>Dashboard not found</h1>');
  }
});

app.get('*', (c) => {
  try {
    const html = readFileSync(join(process.cwd(), 'public', 'index.html'), 'utf-8');
    return c.html(html);
  } catch {
    return c.html('<h1>PrysmisAI</h1><p>Server running</p>');
  }
});

const port = parseInt(process.env.PORT || '3000');

serve({ fetch: app.fetch, port });

console.log(`PrysmisAI running on port ${port}`);

// Preload the embedded model in the background so first chat is faster
preloadModel().catch(console.error);