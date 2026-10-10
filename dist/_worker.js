const encoder = new TextEncoder();
const attempts = new Map();
const cookieName = '__Secure-profit';
const lifetime = 86400;
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const digest = text => crypto.subtle.digest('SHA-256', encoder.encode(text));
function response(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', ...extra}});
}
function cookie(value, maxAge) { return `${cookieName}=${value}; Path=/api/profit; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`; }
async function key(env, data) {
  return crypto.subtle.importKey('raw', await digest(data.sessionKey + ':' + env.PROFIT_PASSWORD), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}
async function authorized(request, signingKey) {
  const token = (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires, signature] = token.split('.');
  if (+expires <= Date.now() || +expires > Date.now() + lifetime * 1000 + 10000) return false;
  return crypto.subtle.verify('HMAC', signingKey, Uint8Array.from(signature.match(/../g), s => parseInt(s, 16)), encoder.encode(expires));
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/profit')) {
      const result = await env.ASSETS.fetch(request);
      const headers = new Headers(result.headers);
      headers.set('Cache-Control', 'no-cache');
      return new Response(result.body, {status: result.status, headers});
    }
    try {
      if (!env.PROFIT_PASSWORD || !env.PROFIT_DATA) return response({error: '访问入口暂未就绪，请稍后再试。'}, 503);
      const data = JSON.parse(env.PROFIT_DATA);
      if (!data.sessionKey || !data.html || !data.orders) return response({error: '访问入口暂未就绪。'}, 503);
      const signingKey = await key(env, data);
      if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) return response({error: '请求来源无效。'}, 403);
      if (url.pathname === '/api/profit/logout' && request.method === 'POST') return response({ok: true}, 200, {'Set-Cookie': cookie('', 0)});
      if (url.pathname !== '/api/profit') return response({error: '未找到。'}, 404);
      const payload = {html: data.html, orders: data.orders};
      if (request.method === 'GET') return await authorized(request, signingKey) ? response(payload) : response({error: '请输入访问密码。'}, 401);
      if (request.method !== 'POST') return response({error: '请求方式无效。'}, 405, {Allow: 'GET, POST'});
      if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) return response({error: '请求格式无效。'}, 400);
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const now = Date.now();
      // Per-isolate throttling; no passwords or client identifiers are logged.
      for (const [id, entry] of attempts) if (entry.until < now) attempts.delete(id);
      let entry = attempts.get(ip);
      if (!entry) { entry = {count: 0, until: now + 60000}; if (attempts.size > 10000) return response({error: '请求较多，请稍后再试。'}, 429); attempts.set(ip, entry); }
      if (++entry.count > 10) return response({error: '尝试次数较多，请一分钟后再试。'}, 429, {'Retry-After': '60'});
      if (Number(request.headers.get('Content-Length')) > 1024) return response({error: '请求过长。'}, 413);
      const raw = await request.text();
      if (raw.length > 1024) return response({error: '请求过长。'}, 413);
      const input = JSON.parse(raw).password;
      if (typeof input !== 'string' || input.length > 256) return response({error: '密码不正确，请重新输入。'}, 401);
      const actual = new Uint8Array(await digest(input));
      const expected = new Uint8Array(await digest(env.PROFIT_PASSWORD));
      let difference = 0; for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
      if (difference) return response({error: '密码不正确，请重新输入。'}, 401);
      attempts.delete(ip);
      const expires = String(Date.now() + lifetime * 1000);
      const signature = hex(await crypto.subtle.sign('HMAC', signingKey, encoder.encode(expires)));
      return response(payload, 200, {'Set-Cookie': cookie(expires + '.' + signature, lifetime)});
    } catch { return response({error: '暂时无法打开，请稍后重试。'}, 503); }
  }
};
