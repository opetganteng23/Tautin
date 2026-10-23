// Backup MongoDB ke berkas gzip JSON per koleksi, simpan 14 hari terakhir.
// Pakai: node --env-file=.env scripts/backup-mongo.mjs [folder-tujuan]
// Jadwal (cron server): 30 2 * * * cd ~/apps/tautin && node --env-file=.env scripts/backup-mongo.mjs
import { MongoClient, EJSON } from "mongodb";
import { createGzip } from "node:zlib";
import { createWriteStream, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { homedir } from "node:os";
import { join } from "node:path";

const KEEP_DAYS = 14;
const root = process.argv[2] || join(homedir(), "backups", "tautin");
const stamp = new Date().toISOString().slice(0, 10);
const dir = join(root, stamp);
mkdirSync(dir, { recursive: true });

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db();
// Data mentah analitik bisa besar dan kedaluwarsa sendiri (TTL); tidak ikut dicadangkan.
const SKIP = new Set(["rateLimits", "clickEvents", "pageViews"]);
let total = 0;
for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
  if (SKIP.has(name) || name.startsWith("system.")) continue;
  const cursor = db.collection(name).find();
  async function* lines() { for await (const d of cursor) { total++; yield EJSON.stringify(d, { relaxed: false }) + "\n"; } }
  await pipeline(Readable.from(lines()), createGzip(), createWriteStream(join(dir, `${name}.jsonl.gz`), { mode: 0o600 }));
}
await client.close();

for (const d of readdirSync(root)) {
  const p = join(root, d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Date.now() - statSync(p).mtimeMs > KEEP_DAYS * 86400000) rmSync(p, { recursive: true, force: true });
}
console.log(`Backup selesai: ${dir} (${total} dokumen)`);
