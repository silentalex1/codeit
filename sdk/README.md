# PrysmisAI SDK — v1.0.0

Official JavaScript SDK for the PrysmisAI (PSAI-v1.0) model.

## Quick Start

### Browser (script tag)
```html
<script src="../sdk/index.js"></script>
<script>
  const client = PrysmisAI.createClient();
  const response = await client.chat("How do I tween a part?");
  console.log(response.text);
</script>
```

### Node.js
```js
const PrysmisAI = require('../sdk/index.js');
const client = PrysmisAI.createClient();
const response = await client.chat("How do I tween a part?");
console.log(response.text);
```

## createClient(config?)

| Option | Type | Default |
|--------|------|---------|
| `endpoint` | string | `https://codeit.rest/v1/chat/completions` |
| `auth` | string | Built-in key |
| `model` | string | `prysmis-1` |
| `temperature` | number | `0.7` |
| `maxTokens` | number | `1024` |
| `systemPrompt` | string | PSAI-v1.0 system prompt |

## client.chat(message, options?)

Returns `{ text, model, usage, raw }`.

## Events

```js
client
  .onConnect(({ model, version }) => console.log('Connected:', model))
  .onDisconnect(() => console.warn('Disconnected'))
  .onError(({ status, message }) => console.error(status, message));
```

## client.configure(updates)

Hot-updates any config option and restarts keep-alive.

## client.isConnected

Boolean — live connection status updated by the keep-alive pinger every 45s.

## client.stopKeepAlive()

Stops the background keep-alive interval (useful on page unload).
