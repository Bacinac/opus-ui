// The production web server every module ships. In dev, Vite serves the app
// and proxies /api to the backend; in production the built adapter-node handler
// serves the app and this proxies /api — the same split, so a page cannot tell
// which one it is running under.
//
// It is copied beside the build as /app/server.mjs, which is where the handler
// import below resolves.
import http from "node:http";
import { pathToFileURL } from "node:url";
import { createProxyServer } from "http-proxy-3";

const peerOf = (req) => (req.socket.remoteAddress || "").replace(/^::ffff:/, "");

const chainOf = (header) => (header || "").split(",").map((a) => a.trim()).filter(Boolean);

// The backend believes the address this server passes on, so this is where it is
// decided. The tunnel's cf-connecting-ip is Cloudflare's own word, and Cloudflare
// also appends it to x-forwarded-for; the house proxy passes a cf-connecting-ip a
// caller wrote straight through but replaces x-forwarded-for with the caller's
// socket. So the Cloudflare header counts only where the chain vouches for it,
// otherwise the last address in the chain is the client, and anybody who is not
// a trusted proxy is known by the socket alone.
export const forwarded = (req, trusted) => {
  const peer = peerOf(req);
  let client = peer;
  if (trusted.has(peer)) {
    const chain = chainOf(req.headers["x-forwarded-for"]);
    const cloudflare = chainOf(req.headers["cf-connecting-ip"])[0];
    client = cloudflare && chain.includes(cloudflare) ? cloudflare : chain.at(-1) || peer;
  }
  return {
    "cf-connecting-ip": client,
    "x-forwarded-for": client,
    "x-forwarded-host": req.headers.host || "",
    "x-forwarded-proto": req.headers["x-forwarded-proto"] || "http",
  };
};

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "same-origin",
  "content-security-policy": "frame-ancestors 'self'",
};

const isApi = (url) => url === "/api" || url.startsWith("/api/");

async function serve() {
  const target = process.env.OPUS_API_URL;
  if (!target) throw new Error("OPUS_API_URL is not set: nothing to send /api to");
  const port = Number(process.env.PORT) || 5173;
  const trusted = new Set(
    (process.env.OPUS_TRUSTED_PROXIES || "").split(",").map((a) => a.trim()).filter(Boolean),
  );
  const { handler } = await import("./build/handler.js");

  const proxy = createProxyServer({ target, changeOrigin: true });

  // A dead or booting backend must not take the web server down with it: the
  // request is answered and the browser asks again.
  proxy.on("error", (err, _req, res) => {
    console.error(`[ui] /api proxy error: ${err.message}`);
    if (res && "writeHead" in res && !res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain" });
      res.end("api unavailable");
    } else if (res && "destroy" in res) {
      res.destroy();
    }
  });

  // A reader who leaves must be heard upstream. Otherwise the proxy keeps draining
  // an abandoned stream — a film, an original photograph — at full speed, and the
  // backend goes on serving an empty room.
  proxy.on("proxyRes", (proxyRes, _req, res) => {
    res.on("close", () => {
      if (!res.writableFinished) proxyRes.destroy();
    });
  });

  const server = http.createServer((req, res) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    if (isApi(req.url)) proxy.web(req, res, { headers: forwarded(req, trusted) });
    else handler(req, res);
  });

  // An upgrade is not a request and never reaches the handler above; a page that
  // opens a websocket to its backend would wait on it forever.
  server.on("upgrade", (req, socket, head) => {
    if (isApi(req.url)) proxy.ws(req, socket, head, { headers: forwarded(req, trusted) });
    else socket.destroy();
  });

  server.listen(port, () => {
    console.log(`[ui] serving build on :${port}, /api → ${target}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await serve();
