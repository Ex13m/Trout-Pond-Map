import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Общая база водоёмов, добавленных сообществом.
// Хранится в Netlify Blobs: store "community", ключ "venues" (JSON-массив).
export default async (req: Request, _context: Context) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }
  const store = getStore("community");
  const venues = (await store.get("venues", { type: "json" })) || [];
  return new Response(JSON.stringify({ venues }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
};

export const config: Config = {
  path: "/api/community-venues",
};
