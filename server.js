const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 8000;
const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:5000';

let pythonBackendProcess = null;
let aiBackendReady = false;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const GOOGLE_CLIENT_ID = '730413840136-d2fsk5u4nh1bt8jpk685vjhn6eot46k6.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:8000/auth/callback';

const DATABASE_URL = process.env.DATABASE_URL || '';
let pool = null;
let databaseAvailable = false;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const sessions = new Map();

function generateSessionId() {
  const uuid = crypto.randomUUID();
  return `c/${uuid}`;
}

async function initDatabase() {
  if (!pool) {
    console.log('No database configured - running in local storage mode');
    databaseAvailable = false;
    return;
  }
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255),
        username VARCHAR(255),
        picture TEXT,
        custom_instructions TEXT,
        api_config JSONB,
        api_keys JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized successfully');
    databaseAvailable = true;
  } catch (error) {
    console.error('Database initialization error:', error);
    console.log('Falling back to local storage mode');
    databaseAvailable = false;
  }
}

initDatabase();

function startPythonBackend() {
  const isProduction = process.env.RENDER || process.env.RAILWAY || process.env.HEROKU;
  const useHuggingFace = process.env.USE_HUGGINGFACE === 'true';
  
  if (useHuggingFace) {
    console.log('🤖 Using Hugging Face API for AI responses');
    aiBackendReady = true;
    return;
  }
  
  if (isProduction) {
    console.log('Production environment detected - AI backend should run as separate service');
    aiBackendReady = true;
    return;
  }

  console.log('Starting Python AI backend locally...');
  
  const scriptPath = path.join(__dirname, 'ai_backend.py');
  
  pythonBackendProcess = spawn('python', [scriptPath], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  pythonBackendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Python Backend]: ${output}`);
    
    if (output.includes('Running on') || output.includes('Serving')) {
      aiBackendReady = true;
      console.log('✅ Python AI backend is ready!');
    }
  });

  pythonBackendProcess.stderr.on('data', (data) => {
    console.error(`[Python Backend Error]: ${data.toString()}`);
  });

  pythonBackendProcess.on('close', (code) => {
    console.log(`Python backend process exited with code ${code}`);
    aiBackendReady = false;
    pythonBackendProcess = null;
  });

  // Give it time to start
  setTimeout(() => {
    if (!aiBackendReady) {
      console.log('⚠️ Python backend taking longer to start...');
    }
  }, 10000);
}

function stopPythonBackend() {
  if (pythonBackendProcess) {
    console.log('Stopping Python AI backend...');
    pythonBackendProcess.kill();
    pythonBackendProcess = null;
    aiBackendReady = false;
  }
}

// Start Python backend
startPythonBackend();

// Clean up on exit
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  stopPythonBackend();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  stopPythonBackend();
  process.exit(0);
});

app.post('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    const ticket = await oauth2Client.verifyIdToken();
    const payload = ticket.getPayload();
    
    const googleId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'];
    const picture = payload['picture'];
    
    let user;
    
    if (databaseAvailable && pool) {
      const existingUser = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );
      
      if (existingUser.rows.length > 0) {
        user = existingUser.rows[0];
        await pool.query(
          'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );
      } else {
        const newUser = await pool.query(
          'INSERT INTO users (google_id, email, username, picture, custom_instructions, api_config, api_keys) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [googleId, email, name, picture, '', '{}', '[]']
        );
        user = newUser.rows[0];
      }
    } else {
      // Fallback to in-memory user storage
      user = {
        id: crypto.randomUUID(),
        google_id: googleId,
        email: email,
        username: name,
        picture: picture,
        custom_instructions: '',
        api_config: {},
        api_keys: []
      };
    }
    
    const sessionId = generateSessionId();
    sessions.set(sessionId, {
      userId: user.id,
      userData: user,
      createdAt: new Date().toISOString()
    });
    
    res.redirect(`/?session=${sessionId}`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect('/?error=auth_failed');
  }
});

app.get('/api/session', async (req, res) => {
  const sessionId = req.query.session || req.headers['x-session-id'];
  
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    
    if (session.userData) {
      // Use in-memory user data from session
      return res.json({
        sessionId,
        authenticated: true,
        user: session.userData
      });
    }
    
    if (databaseAvailable && pool && session.userId) {
      const user = await pool.query('SELECT id, username, email, picture, custom_instructions, api_config, api_keys FROM users WHERE id = $1', [session.userId]);
      
      if (user.rows.length > 0) {
        return res.json({
          sessionId,
          authenticated: true,
          user: user.rows[0]
        });
      }
    }
  }
  
  const newSessionId = generateSessionId();
  sessions.set(newSessionId, {
    userId: null,
    createdAt: new Date().toISOString()
  });
  
  res.json({
    sessionId: newSessionId,
    authenticated: false
  });
});

app.post('/api/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.json({ success: true });
});

app.get('/api/user', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const session = sessions.get(sessionId);
  
  if (session.userData) {
    // Use in-memory user data from session
    return res.json(session.userData);
  }
  
  if (!databaseAvailable || !pool) {
    return res.status(401).json({ error: 'Database not available' });
  }
  
  const user = await pool.query('SELECT id, username, email, picture, custom_instructions, api_config, api_keys FROM users WHERE id = $1', [session.userId]);
  
  if (user.rows.length > 0) {
    return res.json(user.rows[0]);
  }
  
  res.status(404).json({ error: 'User not found' });
});

app.put('/api/user', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const session = sessions.get(sessionId);
  const { customInstructions, apiConfig, username } = req.body;
  
  if (session.userData) {
    // Update in-memory user data
    if (customInstructions !== undefined) session.userData.custom_instructions = customInstructions;
    if (apiConfig !== undefined) session.userData.api_config = apiConfig;
    if (username !== undefined) session.userData.username = username;
    return res.json({ success: true });
  }
  
  if (!databaseAvailable || !pool) {
    return res.status(500).json({ error: 'Database not available' });
  }
  
  try {
    await pool.query(
      'UPDATE users SET custom_instructions = COALESCE($1, custom_instructions), api_config = COALESCE($2, api_config), username = COALESCE($3, username), updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [customInstructions, apiConfig, username, session.userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    const currentSessionId = sessionId || generateSessionId();
    
    if (!sessions.has(currentSessionId)) {
      sessions.set(currentSessionId, {
        userId: null,
        createdAt: new Date().toISOString()
      });
    }
    
    // Check if we should use Hugging Face API
    const useHuggingFace = process.env.USE_HUGGINGFACE === 'true';
    const hfApiUrl = process.env.HF_API_URL || 'https://api-inference.huggingface.co/models/realalexdev/prysmisai-v1';
    const hfApiToken = process.env.HF_API_TOKEN;
    
    let aiResponse;
    
    if (useHuggingFace && hfApiToken) {
      // Use Hugging Face API
      try {
        const systemMessage = "You are PrysmisAI, a coding assistant specialized in Roblox Lua. You give concise, accurate, and complete answers without repeating yourself.";
        const fullMessage = `${systemMessage}\n\nUser: ${message}\nAssistant:`;
        
        const response = await axios.post(hfApiUrl, {
          inputs: fullMessage,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.7,
            top_p: 0.9,
            repetition_penalty: 1.2,
            return_full_text: false
          }
        }, {
          headers: {
            'Authorization': `Bearer ${hfApiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        });
        
        let aiText = '';
        if (Array.isArray(response.data) && response.data.length > 0) {
          aiText = response.data[0].generated_text || '';
        } else if (typeof response.data === 'object' && response.data.generated_text) {
          aiText = response.data.generated_text;
        } else {
          aiText = String(response.data);
        }
        
        // Clean up the response
        if (aiText.includes('Assistant:')) {
          aiText = aiText.split('Assistant:').pop().trim();
        }
        if (aiText.includes(systemMessage)) {
          aiText = aiText.replace(systemMessage, '').trim();
        }
        if (aiText.includes(message)) {
          aiText = aiText.replace(message, '').trim();
        }
        
        aiResponse = {
          id: `chatcmpl_prysmis_${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'prysmis-1-hf',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: aiText
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: message.length,
            completion_tokens: aiText.length,
            total_tokens: message.length + aiText.length
          }
        };
        
        console.log('🤖 Used Hugging Face API for AI response');
        
      } catch (hfError) {
        console.error('Hugging Face API error:', hfError.message);
        return res.status(503).json({ 
          error: 'Hugging Face API not available. Please check your API configuration.',
          details: process.env.NODE_ENV === 'development' ? hfError.message : undefined
        });
      }
    } else {
      // Try to connect to Python AI backend if available
      try {
        const response = await axios.post(`${AI_BACKEND_URL}/api/chat`, {
          message: message
        }, {
          timeout: 60000
        });
        aiResponse = response.data;
      } catch (axiosError) {
        console.error('AI backend error:', axiosError.message);
        return res.status(503).json({ 
          error: 'AI backend not available. Please ensure the Python AI backend is running or configure Hugging Face API.',
          details: process.env.NODE_ENV === 'development' ? axiosError.message : undefined
        });
      }
    }
    
    res.json({
      ...aiResponse,
      sessionId: currentSessionId
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', database: 'connected' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Production URL: https://codeit-7u2k.onrender.com/`);
  console.log(`🤖 AI Backend: ${process.env.USE_HUGGINGFACE === 'true' ? 'Hugging Face API' : 'Local Python Backend'}`);
  console.log(`🔐 OAuth configured with Google Client ID: ${GOOGLE_CLIENT_ID}`);
});