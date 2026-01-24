import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

const state = new Map();

function now() { return Date.now(); }
function getState(id) {
  if (!state.has(id)) state.set(id, { studio_ts: 0, lastPacket: null });
  return state.get(id);
}

app.post("/sync", (req, res) => {
  const b = req.body || {};
  const type = b.type;
  const extension_id = String(b.extension_id || "");
  const ts = Number(b.ts || now());

  if (!extension_id) return res.status(400).json({ ok: false });

  const s = getState(extension_id);

  if (type === "heartbeat") {
    s.studio_ts = ts;
    return res.json({ ok: true });
  }

  if (type === "connect") {
    s.lastPacket = { ts, prompt: "", ops: [] };
    return res.json({ ok: true });
  }

  if (type === "prompt") {
    s.lastPacket = { ts, prompt: String(b.prompt || ""), ops: Array.isArray(b.ops) ? b.ops : [] };
    return res.json({ ok: true });
  }

  if (type === "ack") {
    if (s.lastPacket && s.lastPacket.ts === ts) s.lastPacket = null;
    return res.json({ ok: true });
  }

  res.status(400).json({ ok: false });
});

app.get("/sync", (req, res) => {
  const extension_id = String(req.query.extension_id || "");
  const since = Number(req.query.since || 0);
  if (!extension_id) return res.status(400).json({ ok: false });

  const s = getState(extension_id);
  const connected = now() - (s.studio_ts || 0) < 5000;

  if (s.lastPacket && s.lastPacket.ts > since) {
    return res.json({
      ok: true,
      connected,
      studio_ts: s.studio_ts || 0,
      ts: s.lastPacket.ts,
      prompt: s.lastPacket.prompt,
      ops: s.lastPacket.ops
    });
  }

  res.json({ ok: true, connected, studio_ts: s.studio_ts || 0 });
});

app.listen(8080);
