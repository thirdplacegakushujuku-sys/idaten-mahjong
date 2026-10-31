export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB; // ステップ1で設定した変数名 'DB'

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  try {
    // 取得処理 (GET)
    if (request.method === "GET") {
      if (!mode) return new Response("Mode required", { status: 400, headers: corsHeaders });
      const { results } = await db.prepare(
        "SELECT name, time, timestamp FROM rankings WHERE mode = ? ORDER BY time ASC LIMIT 10"
      ).bind(mode).all();
      return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 送信処理 (POST)
    if (request.method === "POST") {
      const data = await request.json();
      if (!data.mode || !data.name || typeof data.time !== 'number') {
        return new Response("Invalid data", { status: 400, headers: corsHeaders });
      }
      const safeName = data.name.substring(0, 10);
      if (data.time < 1000) return new Response("Invalid time", { status: 400, headers: corsHeaders }); // 異常値ブロック

      await db.prepare(
        "INSERT INTO rankings (mode, name, time, timestamp) VALUES (?, ?, ?, ?)"
      ).bind(data.mode, safeName, data.time, Date.now()).run();

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("DB Error:", error);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }
}