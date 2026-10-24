// Fase 0 — investigación. Proxy de prueba hacia nodos de Monero stagenet.
// Mide: ¿fetch() a puertos no estándar funciona? ¿connect() (TCP) sí? ¿Se puede agregar CORS?
// Rutas:
//   /fetch/<nodo>/<ruta-rpc>    → usa fetch()
//   /tcp/<nodo>/<ruta-rpc>      → usa connect() con HTTP/1.1 a mano
//   /probe                      → prueba ambos métodos contra todos los nodos y devuelve un informe
import { connect } from "cloudflare:sockets";

// Lista cerrada: el proxy NO es abierto (evita usarlo para atacar a terceros).
const NODES = {
  "xmr-tw": { host: "stagenet.xmr-tw.org", port: 38081 },
  monerodevs: { host: "node.monerodevs.org", port: 38089 },
  monerodevs2: { host: "node2.monerodevs.org", port: 38089 },
  boldsuck: { host: "xmr-lux.boldsuck.org", port: 38081 },
};

// Solo métodos de lectura / envío de tx que necesita una wallet ligera.
const ALLOWED_PATHS = new Set([
  "/json_rpc", "/get_height", "/get_info", "/get_transactions", "/get_outs.bin", "/getblocks.bin",
  "/getblocks_by_height.bin", "/gethashes.bin", "/get_o_indexes.bin", "/send_raw_transaction",
  "/get_transaction_pool_hashes.bin", "/get_output_distribution.bin",
]);
const ALLOWED_JSON_METHODS = new Set([
  "get_info", "get_block_count", "get_last_block_header", "get_block_header_by_height",
  "get_block_headers_range", "get_block", "get_fee_estimate", "get_version", "hard_fork_info",
  "get_output_distribution",
]);
const MAX_BODY = 512 * 1024;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function err(status, msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

async function viaFetch(node, path, method, body, ctype) {
  const url = `http://${node.host}:${node.port}${path}`;
  const r = await fetch(url, { method, body, headers: ctype ? { "content-type": ctype } : {} });
  return { status: r.status, headers: { "content-type": r.headers.get("content-type") || "" }, body: await r.arrayBuffer() };
}

async function viaTcp(node, path, method, body, ctype) {
  const sock = connect({ hostname: node.host, port: node.port });
  const w = sock.writable.getWriter();
  const bodyBytes = body ? new Uint8Array(body) : new Uint8Array();
  const head =
    `${method} ${path} HTTP/1.1\r\nHost: ${node.host}:${node.port}\r\nConnection: close\r\n` +
    (ctype ? `Content-Type: ${ctype}\r\n` : "") +
    `Content-Length: ${bodyBytes.length}\r\n\r\n`;
  await w.write(new TextEncoder().encode(head));
  if (bodyBytes.length) await w.write(bodyBytes);
  w.releaseLock();
  const raw = new Uint8Array(await new Response(sock.readable).arrayBuffer());
  // Separar cabeceras y cuerpo (respuesta pequeña de prueba; sin chunked en producción).
  let i = 0;
  while (i < raw.length - 3 && !(raw[i] === 13 && raw[i + 1] === 10 && raw[i + 2] === 13 && raw[i + 3] === 10)) i++;
  const headText = new TextDecoder().decode(raw.slice(0, i));
  const status = Number(headText.split(" ")[1]) || 502;
  const ct = /content-type:\s*([^\r\n]+)/i.exec(headText)?.[1] || "";
  const chunked = /transfer-encoding:\s*chunked/i.test(headText);
  let payload = raw.slice(i + 4);
  if (chunked) payload = dechunk(payload);
  return { status, headers: { "content-type": ct }, body: payload };
}

function dechunk(buf) {
  const out = [];
  let p = 0;
  const td = new TextDecoder();
  while (p < buf.length) {
    let e = p;
    while (e < buf.length - 1 && !(buf[e] === 13 && buf[e + 1] === 10)) e++;
    const size = parseInt(td.decode(buf.slice(p, e)), 16);
    if (!size) break;
    out.push(buf.slice(e + 2, e + 2 + size));
    p = e + 2 + size + 2;
  }
  const total = new Uint8Array(out.reduce((a, b) => a + b.length, 0));
  let o = 0;
  for (const c of out) { total.set(c, o); o += c.length; }
  return total;
}

async function probe() {
  const body = new TextEncoder().encode(JSON.stringify({ jsonrpc: "2.0", id: "0", method: "get_info" }));
  const report = {};
  for (const [name, node] of Object.entries(NODES)) {
    report[name] = {};
    for (const [label, fn] of [["fetch", viaFetch], ["tcp", viaTcp]]) {
      const t = Date.now();
      try {
        const r = await fn(node, "/json_rpc", "POST", body, "application/json");
        const txt = new TextDecoder().decode(r.body);
        const h = /"height":\s*(\d+)/.exec(txt)?.[1];
        report[name][label] = { ok: r.status === 200 && !!h, status: r.status, height: h ? Number(h) : null, ms: Date.now() - t };
      } catch (e) {
        report[name][label] = { ok: false, error: String(e?.message || e), ms: Date.now() - t };
      }
    }
  }
  return new Response(JSON.stringify(report, null, 2), { headers: { "content-type": "application/json", ...cors } });
}

export default {
  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (url.pathname === "/probe") return probe();

    // libwallet (C++ en WASM) descarta la ruta de la URL del nodo y llama a /json_rpc en la raíz.
    // Por eso un nodo también se sirve en la raíz (en producción: un subdominio por nodo).
    let m = /^\/(fetch|tcp)\/([a-z0-9-]+)(\/.*)$/.exec(url.pathname);
    if (!m && ALLOWED_PATHS.has(url.pathname)) m = [null, "fetch", "xmr-tw", url.pathname];
    if (!m) return err(404, "ruta no encontrada");
    const [, mode, nodeName, path] = m;
    const node = NODES[nodeName];
    if (!node) return err(400, "nodo no permitido");
    if (!ALLOWED_PATHS.has(path)) return err(403, "ruta RPC no permitida");
    if (req.method !== "POST" && req.method !== "GET") return err(405, "método no permitido");

    const body = req.method === "POST" ? await req.arrayBuffer() : null;
    if (body && body.byteLength > MAX_BODY) return err(413, "cuerpo demasiado grande");
    if (path === "/json_rpc") {
      try {
        const j = JSON.parse(new TextDecoder().decode(body));
        if (!ALLOWED_JSON_METHODS.has(j.method)) return err(403, `método ${j.method} no permitido`);
      } catch {
        return err(400, "JSON inválido");
      }
    }
    try {
      const fn = mode === "fetch" ? viaFetch : viaTcp;
      const r = await fn(node, path, req.method, body, req.headers.get("content-type"));
      return new Response(r.body, { status: r.status, headers: { ...r.headers, ...cors } });
    } catch (e) {
      return err(502, `upstream: ${e?.message || e}`);
    }
  },
};
