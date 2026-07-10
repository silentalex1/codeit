const PSAI_VERSION = '1.1.0';
const PSAI_MODEL_ID = 'prysmis-1';
const PSAI_DEFAULT_ENDPOINT = 'https://codeit.rest/v1/chat/completions';
const PSAI_DEFAULT_AUTH = 'Bearer sk-prysmis-prod-95fZe5PBGA7ErrKSL9dW3OjweOtioFQI';
const PSAI_SYSTEM_PROMPT = 'You are PSAI-v1.0, an expert Roblox Lua coding assistant created by PrysmisAI. You give concise, accurate, complete Roblox Lua code examples with explanations. Format code in ```lua ``` blocks. Never repeat yourself.';
const PSAI_RETRY_DELAYS = [800, 2000, 5000];
const PSAI_KEEPALIVE_INTERVAL = 30000;
const PSAI_REQUEST_TIMEOUT = 20000;

class PrysmisAIError extends Error {
    constructor(message, statusCode, raw) {
        super(message);
        this.name = 'PrysmisAIError';
        this.statusCode = statusCode || 0;
        this.raw = raw || null;
    }
}

class PrysmisAIClient {
    constructor(config = {}) {
        this._endpoint = config.endpoint || PSAI_DEFAULT_ENDPOINT;
        this._auth = config.auth || PSAI_DEFAULT_AUTH;
        this._model = config.model || PSAI_MODEL_ID;
        this._temperature = config.temperature != null ? config.temperature : 0.7;
        this._maxTokens = config.maxTokens || 1024;
        this._systemPrompt = config.systemPrompt || PSAI_SYSTEM_PROMPT;
        this._connected = false;
        this._keepAliveTimer = null;
        this._requestCount = 0;
        this._errorCount = 0;
        this._lastPingMs = null;
        this._callbacks = { connect: [], disconnect: [], error: [], response: [] };
        this._startKeepAlive();
    }

    get version() { return PSAI_VERSION; }
    get modelId() { return this._model; }
    get isConnected() { return this._connected; }
    get stats() {
        return { requests: this._requestCount, errors: this._errorCount, latencyMs: this._lastPingMs };
    }

    on(event, fn) {
        if (this._callbacks[event]) this._callbacks[event].push(fn);
        return this;
    }

    onConnect(fn) { return this.on('connect', fn); }
    onDisconnect(fn) { return this.on('disconnect', fn); }
    onError(fn) { return this.on('error', fn); }
    onResponse(fn) { return this.on('response', fn); }

    _emit(event, data) {
        (this._callbacks[event] || []).forEach(fn => { try { fn(data); } catch (_) {} });
    }

    _setConnected(val) {
        const prev = this._connected;
        this._connected = !!val;
        if (this._connected && !prev) this._emit('connect', { model: this._model, version: PSAI_VERSION });
        if (!this._connected && prev) this._emit('disconnect', {});
    }

    _timeoutFetch(url, options, ms) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        return fetch(url, { ...options, signal: controller.signal })
            .finally(() => clearTimeout(timer));
    }

    async _pingEndpoint() {
        const start = Date.now();
        try {
            const resp = await this._timeoutFetch(this._endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': this._auth },
                body: JSON.stringify({ model: this._model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 })
            }, 8000);
            this._lastPingMs = Date.now() - start;
            this._setConnected(resp.ok || resp.status === 400 || resp.status === 422);
        } catch {
            this._lastPingMs = null;
            this._setConnected(false);
        }
    }

    _startKeepAlive() {
        if (this._keepAliveTimer) clearInterval(this._keepAliveTimer);
        this._pingEndpoint();
        this._keepAliveTimer = setInterval(() => this._pingEndpoint(), PSAI_KEEPALIVE_INTERVAL);
    }

    stopKeepAlive() {
        if (this._keepAliveTimer) { clearInterval(this._keepAliveTimer); this._keepAliveTimer = null; }
    }

    async _fetchWithRetry(payload, attempt = 0) {
        try {
            const resp = await this._timeoutFetch(this._endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': this._auth },
                body: JSON.stringify(payload)
            }, PSAI_REQUEST_TIMEOUT);

            if (resp.ok) { this._setConnected(true); return resp; }

            if (resp.status >= 500 && attempt < PSAI_RETRY_DELAYS.length) {
                await new Promise(r => setTimeout(r, PSAI_RETRY_DELAYS[attempt]));
                return this._fetchWithRetry(payload, attempt + 1);
            }

            this._setConnected(resp.status !== 0);
            return resp;
        } catch (err) {
            this._setConnected(false);
            if (attempt < PSAI_RETRY_DELAYS.length) {
                await new Promise(r => setTimeout(r, PSAI_RETRY_DELAYS[attempt]));
                return this._fetchWithRetry(payload, attempt + 1);
            }
            throw err;
        }
    }

    async chat(userMessage, options = {}) {
        this._requestCount++;
        const payload = {
            model: options.model || this._model,
            messages: [
                { role: 'system', content: options.systemPrompt || this._systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: options.temperature != null ? options.temperature : this._temperature,
            max_tokens: options.maxTokens || this._maxTokens
        };

        const resp = await this._fetchWithRetry(payload);

        if (!resp.ok) {
            this._errorCount++;
            const errText = await resp.text().catch(() => resp.statusText);
            const error = new PrysmisAIError(`API returned ${resp.status}: ${errText}`, resp.status);
            this._emit('error', { status: resp.status, message: errText });
            throw error;
        }

        const data = await resp.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            this._errorCount++;
            throw new PrysmisAIError('Unexpected response format', 0, data);
        }

        const result = {
            text: data.choices[0].message.content,
            model: data.model || this._model,
            usage: data.usage || null,
            latencyMs: this._lastPingMs,
            raw: data
        };

        this._emit('response', result);
        return result;
    }

    configure(updates = {}) {
        if (updates.endpoint !== undefined) this._endpoint = updates.endpoint;
        if (updates.auth !== undefined) this._auth = updates.auth;
        if (updates.model !== undefined) this._model = updates.model;
        if (updates.temperature != null) this._temperature = updates.temperature;
        if (updates.maxTokens !== undefined) this._maxTokens = updates.maxTokens;
        if (updates.systemPrompt !== undefined) this._systemPrompt = updates.systemPrompt;
        return this;
    }

    toJSON() {
        return { version: PSAI_VERSION, model: this._model, endpoint: this._endpoint, connected: this._connected, stats: this.stats };
    }
}

const PrysmisAI = {
    version: PSAI_VERSION,
    modelId: PSAI_MODEL_ID,
    defaultEndpoint: PSAI_DEFAULT_ENDPOINT,
    systemPrompt: PSAI_SYSTEM_PROMPT,
    PrysmisAIClient,
    PrysmisAIError,
    createClient(config = {}) {
        return new PrysmisAIClient(config);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrysmisAI;
} else if (typeof window !== 'undefined') {
    window.PrysmisAI = PrysmisAI;
}
