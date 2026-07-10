const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 10000;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:10000/auth/callback';

app.use(express.static(__dirname));
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/realalexdev/prysmisai-v1',
      req.body,
      { headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization || '' } }
    );
    res.json(hfResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to connect to AI' });
  }
});

app.get('/auth/google', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&response_type=code&scope=openid%20email%20profile&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&access_type=offline`;
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/?error=no_code_provided');

  try {
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    });

    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
    });

    const user = profileResponse.data;
    const username = user.name || user.email.split('@')[0];
    res.redirect(`/?login=success&name=${encodeURIComponent(username)}`);
  } catch (error) {
    res.redirect('/?error=oauth_failed');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PrysmisAI server running on port ${PORT}`);
});
