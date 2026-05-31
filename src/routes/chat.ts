import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { streamOllama } from '../ai/ollama';
import { getSystemPrompt } from '../ai/agentPrompts';
import { generateImage } from '../ai/tools';

export const chatRoutes = new Hono();

chatRoutes.post('/chat/stream', async (c) => {
  try {
    const body = await c.req.json();
    const { message, history = [], agent = null, images = [] } = body;

    if (!message || typeof message !== 'string') {
      return c.json({ error: 'Message is required' }, 400);
    }

    const systemPrompt = getSystemPrompt(agent);

    let imageResult: any = null;

    if (agent === 'UI Build' || agent === 'Map Build') {
      const imagePrompt = message.length > 15 
        ? message 
        : `High quality detailed Roblox ${agent === 'UI Build' ? 'UI / GUI design' : 'map and environment concept'}: ${message}`;
      
      imageResult = await generateImage(imagePrompt);
    }

    return streamSSE(c, async (stream) => {
      try {
        await streamOllama(
          {
            message,
            history,
            systemPrompt,
            images,
          },
          async (token) => {
            await stream.writeSSE({
              data: JSON.stringify({ type: 'token', content: token }),
            });
          },
          async () => {
            if (imageResult && imageResult.success && imageResult.imageDataUrl) {
              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'image',
                  imageDataUrl: imageResult.imageDataUrl,
                  message: imageResult.message
                })
              });
            }
            await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) });
          }
        );
      } catch (err: any) {
        console.error('Streaming error, using fallback:', err);
        // Always provide content to the user instead of error state
        await stream.writeSSE({
          data: JSON.stringify({ type: 'token', content: 'Sorry, I had trouble generating a full response. ' }),
        });
        await stream.writeSSE({
          data: JSON.stringify({ type: 'token', content: 'How else can I help you today?' }),
        });
        await stream.writeSSE({ data: JSON.stringify({ type: 'done' }) });
      }
    });
  } catch (err: any) {
    console.error('Request error:', err);
    return c.json({ error: err.message || 'Internal Server Error' }, 500);
  }
});

chatRoutes.get('/models', async (c) => {
  try {
    const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const res = await fetch(`${base}/api/tags`);
    return c.json(await res.json());
  } catch {
    return c.json({ models: [] });
  }
});

// OpenAI-compatible endpoint
// Supports both /v1/chat/completions and /prysmisai/v1/chat/completions
chatRoutes.post('/v1/chat/completions', async (c) => {
  try {
    const body = await c.req.json();
    const messages = body.messages || [];
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || 'Hello';
    const stream = body.stream !== false;

    const systemPrompt = getSystemPrompt(null);

    if (!stream) {
      // Non-streaming - simple response
      return c.json({
        id: 'prysmisai-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: body.model || 'prysmisai-local',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: `Thanks for your message: "${lastUserMessage}". How else can I help you today?`
          },
          finish_reason: 'stop'
        }]
      });
    }

    // Streaming response
    return streamSSE(c, async (stream) => {
      try {
        // Try local model first
        await streamOllama(
          {
            message: lastUserMessage,
            history: messages.slice(0, -1).map((m: any) => ({
              role: m.role,
              content: m.content
            })),
            systemPrompt,
          },
          async (token) => {
            await stream.writeSSE({
              data: JSON.stringify({
                id: 'prysmisai-' + Date.now(),
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: body.model || 'prysmisai-local',
                choices: [{ index: 0, delta: { content: token }, finish_reason: null }]
              })
            });
          },
          async () => {
            await stream.writeSSE({
              data: JSON.stringify({
                id: 'prysmisai-' + Date.now(),
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: body.model || 'prysmisai-local',
                choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
              })
            });
          }
        );
      } catch (err: any) {
        console.error('Model error on /prysmisai/v1/chat/completions, using fallback:', err);
        // Always send content instead of error
        await stream.writeSSE({
          data: JSON.stringify({
            id: 'prysmisai-fallback',
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: body.model || 'prysmisai-local',
            choices: [{ index: 0, delta: { content: 'Sorry, I had trouble generating a full response. ' }, finish_reason: null }]
          })
        });
        await stream.writeSSE({
          data: JSON.stringify({
            id: 'prysmisai-fallback',
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: body.model || 'prysmisai-local',
            choices: [{ index: 0, delta: { content: 'How else can I help you today?' }, finish_reason: 'stop' }]
          })
        });
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Error' }, 500);
  }
});

