const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const EXTENSION_ID = process.env.EXTENSION_ID || "edfbngkhlmkolckogoigjmkellhokgeo";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "sync.json");

const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const nowTs = () => Math.floor(Date.now() / 1000);

const readDb = () => {
  try {
    ensureDir(DB_DIR);
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ last: {} }, null, 2));
    const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    if (!data.last || typeof data.last !== "object") return { last: {} };
    return data;
  } catch {
    return { last: {} };
  }
};

const writeDb = (db) => {
  ensureDir(DB_DIR);
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

const getExtId = (req, bodyOrQuery) => {
  const h = req.headers["x-extension-id"];
  const b = bodyOrQuery && bodyOrQuery.extension_id;
  const v = String(h || b || "").trim();
  return v;
};

app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://codeit.rest");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Extension-Id");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.post("/sync", (req, res) => {
  const extId = getExtId(req, req.body);
  if (extId !== EXTENSION_ID) return res.status(403).json({ ok: false });

  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";
  const ops = Array.isArray(req.body?.ops) ? req.body.ops : [];

  const db = readDb();
  db.last[extId] = { ts: nowTs(), prompt, ops };
  writeDb(db);

  res.json({ ok: true, ts: db.last[extId].ts });
});

app.get("/sync", (req, res) => {
  const extId = getExtId(req, req.query);
  if (extId !== EXTENSION_ID) return res.status(403).json({ connected: false });

  const since = Number(req.query.since || 0);
  const db = readDb();
  const payload = db.last[extId];

  if (!payload) return res.json({ connected: true, ts: since, prompt: "", ops: [] });
  if (Number(payload.ts) <= since) return res.json({ connected: true, ts: since, prompt: "", ops: [] });

  res.json({ connected: true, ts: payload.ts, prompt: payload.prompt || "", ops: payload.ops || [] });
});

const publicDir = path.join(process.cwd(), "public");
app.use("/", express.static(publicDir));

app.listen(PORT, () => process.stdout.write("ok\n"));
