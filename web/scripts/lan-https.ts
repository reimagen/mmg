// LAN-only HTTPS in front of the Next dev server so a phone browser can unlock its mic.
// Run: bun web/scripts/lan-https.ts  ->  https://<mac-lan-ip>:3443  (self-signed, one trust tap on the phone)
const UPSTREAM = "http://127.0.0.1:3000";
const PORT = 3443;
Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  tls: { key: Bun.file(new URL("../.certs/key.pem", import.meta.url)), cert: Bun.file(new URL("../.certs/cert.pem", import.meta.url)) },
  fetch(req) {
    const url = new URL(req.url);
    return fetch(UPSTREAM + url.pathname + url.search, { method: req.method, headers: req.headers, body: req.body, redirect: "manual" });
  },
});
console.log(`phone -> https://${process.env.LAN_IP ?? "<mac-ip>"}:${PORT}/`);
