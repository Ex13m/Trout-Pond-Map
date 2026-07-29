import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Запрос актуализации базы. Пароль проверяется по SHA-256 хэшу —
// открытым текстом нигде не хранится. Каждый успешный запрос пишется
// в очередь: ближайшая волна агентов (или месячный GitHub Action)
// забирает её и выполняет поиск.
const PASSWORD_SHA256 = "fd92e13988b31fb34e35014fcffb8cd23e377c15fad1672a61b2dd77aa37bf65"; // sha256("TroutAreaMaps02")

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async (req: Request, context: Context) => {
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
  const pass = typeof body?.password === "string" ? body.password : "";
  if ((await sha256Hex(pass)) !== PASSWORD_SHA256) {
    return new Response(JSON.stringify({ error: "wrong_password" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const store = getStore({ name: "actualize", consistency: "strong" });
  const queue: any[] = (await store.get("queue", { type: "json" })) || [];
  queue.push({ ts: new Date().toISOString(), ip: context.ip || "unknown" });
  // держим последние 100 запросов
  await store.setJSON("queue", queue.slice(-100));

  return new Response(
    JSON.stringify({ ok: true, queued: queue.length, ts: new Date().toISOString() }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

export const config: Config = { path: "/api/actualize" };
