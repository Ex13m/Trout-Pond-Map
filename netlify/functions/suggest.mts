import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Приём водоёма в общую базу. Лимит: 10 добавлений в сутки с одного IP.
const DAILY_LIMIT = 10;
const MAX_VENUES = 5000;

const COUNTRIES = new Set([
  "it","fr","es","pt","de","at","ch","si","cz","sk","hu","pl","lt","lv","ee",
  "fi","se","no","dk","be","nl","gb","ie","hr","bg","ro",
  "ru","ge","am","az","kz","jp","kr","cn","tw",
  "kg","uz","tj","tm",
]);

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
}

function validate(body: any): { ok: true; venue: any } | { ok: false; error: string } {
  const name = str(body?.name, 80);
  if (!name) return { ok: false, error: "name_required" };
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!isFinite(lat) || !isFinite(lng)) return { ok: false, error: "coords_required" };
  if (lat < 18 || lat > 72 || lng < -11 || lng > 180) return { ok: false, error: "coords_out_of_coverage" };
  const country = typeof body?.country === "string" && COUNTRIES.has(body.country.toLowerCase())
    ? body.country.toLowerCase()
    : null;
  if (!country) return { ok: false, error: "country_invalid" };
  let website = str(body?.website, 200);
  if (website && !/^https?:\/\//i.test(website)) website = null;
  const crRaw = body?.catchAndRelease;
  const catchAndRelease = crRaw === true ? true : crRaw === "partial" ? "partial" : false;
  return {
    ok: true,
    venue: {
      id: "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      name,
      country,
      location: str(body?.location, 120) || "",
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
      precision: "approx",
      description: str(body?.description, 500) || "",
      species: [],
      catchAndRelease,
      rules: null,
      price: str(body?.price, 60),
      season: str(body?.season, 60),
      website,
      facilities: [],
      community: true,
      addedAt: new Date().toISOString().slice(0, 10),
    },
  };
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const checked = validate(body);
  if (!checked.ok) {
    return new Response(JSON.stringify({ error: checked.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Лимит по IP на календарные сутки (UTC)
  const ip = context.ip || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const limits = getStore({ name: "limits", consistency: "strong" });
  const limitKey = `${day}:${ip}`;
  const used = Number((await limits.get(limitKey)) || 0);
  if (used >= DAILY_LIMIT) {
    return new Response(
      JSON.stringify({ error: "daily_limit", limit: DAILY_LIMIT }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }
  await limits.set(limitKey, String(used + 1));

  const store = getStore({ name: "community", consistency: "strong" });
  const venues: any[] = (await store.get("venues", { type: "json" })) || [];
  if (venues.length >= MAX_VENUES) {
    return new Response(JSON.stringify({ error: "base_full" }), {
      status: 507,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Дубликат: то же название или точка ближе ~150 м
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const v = checked.venue;
  const dup = venues.find(
    (x) =>
      norm(x.name) === norm(v.name) ||
      (Math.abs(x.lat - v.lat) < 0.0015 && Math.abs(x.lng - v.lng) < 0.0015),
  );
  if (dup) {
    return new Response(JSON.stringify({ error: "duplicate", id: dup.id }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  venues.push(v);
  await store.setJSON("venues", venues);

  return new Response(
    JSON.stringify({ ok: true, venue: v, remainingToday: DAILY_LIMIT - used - 1 }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
};

export const config: Config = {
  path: "/api/suggest",
};
