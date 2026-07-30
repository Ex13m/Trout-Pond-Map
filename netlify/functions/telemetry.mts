import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Телеметрия ошибок фронтенда — сигнал для контура самоулучшения.
// POST: приём ошибки (кольцевой буфер 300 записей, лимит 20/день с IP).
// GET ?password=…: чтение буфера агентом волны (пароль актуализации).
const PASSWORD_SHA256 = "fd92e13988b31fb34e35014fcffb8cd23e377c15fad1672a61b2dd77aa37bf65";
const MAX_ERRORS = 300;
const DAILY_LIMIT = 20;

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : null;

export default async (req: Request, context: Context) => {
  const store = getStore({ name: "telemetry", consistency: "strong" });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const pass = url.searchParams.get("password") || "";
    if ((await sha256Hex(pass)) !== PASSWORD_SHA256) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json" },
      });
    }
    const errors = (await store.get("errors", { type: "json" })) || [];
    return new Response(JSON.stringify({ errors }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const ip = context.ip || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const limits = getStore({ name: "limits", consistency: "strong" });
  const key = `tele:${day}:${ip}`;
  const used = Number((await limits.get(key)) || 0);
  if (used >= DAILY_LIMIT) {
    return new Response(JSON.stringify({ ok: true, dropped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  await limits.set(key, String(used + 1));

  const entry = {
    ts: new Date().toISOString(),
    message: str(body?.message, 500) || "(no message)",
    source: str(body?.source, 200),
    line: Number.isFinite(Number(body?.line)) ? Number(body.line) : null,
    stack: str(body?.stack, 1200),
    url: str(body?.url, 200),
    ua: str(req.headers.get("user-agent"), 200),
    version: str(body?.version, 20),
  };
  const errors: any[] = (await store.get("errors", { type: "json" })) || [];
  errors.push(entry);
  await store.setJSON("errors", errors.slice(-MAX_ERRORS));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = { path: "/api/telemetry" };
