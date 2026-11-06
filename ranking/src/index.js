// Alchemy Fusion - online ranking API (Cloudflare Worker + D1)
// Routes:
//   GET  /            -> "ok"
//   GET  /ranking?uuid=<device uuid>  -> { top: [...10], myRank, myBest }
//   POST /scores      -> { uuid, name, score, z, time } を登録し { ok, id, rank } を返す
const ALLOW_ORIGIN = 'https://tenkai-t.github.io';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
  });
}
function validUuid(v) {
  return typeof v === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(v);
}
function cleanName(v) {
  if (typeof v !== 'string') return null;
  const name = v.trim();
  const len = [...name].length;
  if (len < 1 || len > 12) return null;
  return name;
}
function intIn(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max;
}
async function rankOf(db, row) {
  const r = await db.prepare(
    'SELECT COUNT(*) AS c FROM scores WHERE score > ? OR (score = ? AND created_at < ?) OR (score = ? AND created_at = ? AND id < ?)'
  ).bind(row.score, row.score, row.created_at, row.score, row.created_at, row.id).first();
  return (r ? r.c : 0) + 1;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
    try {
      if (url.pathname === '/' && request.method === 'GET') {
        return new Response('ok', { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders() } });
      }
      if (url.pathname === '/ranking' && request.method === 'GET') {
        const top = await env.DB.prepare(
          'SELECT id, name, score, z, time_sec, created_at FROM scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 10'
        ).all();
        let myRank = null, myBest = null;
        const uuid = url.searchParams.get('uuid');
        if (validUuid(uuid)) {
          const best = await env.DB.prepare(
            'SELECT id, name, score, z, time_sec, created_at FROM scores WHERE uuid = ? ORDER BY score DESC, created_at ASC, id ASC LIMIT 1'
          ).bind(uuid).first();
          if (best) {
            myBest = { id: best.id, name: best.name, score: best.score, z: best.z, time: best.time_sec, date: best.created_at };
            myRank = await rankOf(env.DB, best);
          }
        }
        return json({
          top: (top.results || []).map(e => ({ id: e.id, name: e.name, score: e.score, z: e.z, time: e.time_sec, date: e.created_at })),
          myRank, myBest,
        });
      }
      if (url.pathname === '/scores' && request.method === 'POST') {
        let body;
        try { body = await request.json(); } catch (e) { return json({ error: 'invalid json' }, 400); }
        const uuid = body && body.uuid;
        const name = body && cleanName(body.name);
        const score = body && body.score;
        const z = body && body.z;
        const time = body && body.time;
        if (!validUuid(uuid)) return json({ error: 'invalid uuid' }, 400);
        if (name === null) return json({ error: 'invalid name' }, 400);
        if (!intIn(score, 0, 99999999)) return json({ error: 'invalid score' }, 400);
        if (!intIn(z, 1, 118)) return json({ error: 'invalid z' }, 400);
        if (!intIn(time, 0, 86400)) return json({ error: 'invalid time' }, 400);
        // 送信頻度のつじつまチェック: 同一端末から5秒未満の再送信は受け付けない
        const last = await env.DB.prepare('SELECT created_at FROM scores WHERE uuid = ? ORDER BY id DESC LIMIT 1').bind(uuid).first();
        const now = new Date();
        if (last && now - new Date(last.created_at) < 5000) return json({ error: 'too fast' }, 429);
        const created_at = now.toISOString();
        const ins = await env.DB.prepare(
          'INSERT INTO scores (uuid, name, score, z, time_sec, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(uuid, name, score, z, time, created_at).run();
        const id = ins.meta.last_row_id;
        const rank = await rankOf(env.DB, { id, score, created_at });
        return json({ ok: true, id, rank });
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'server error' }, 500);
    }
  },
};
