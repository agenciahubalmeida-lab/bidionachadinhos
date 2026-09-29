const META_PIXEL_ID = "1562627931838707";
const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v24.0";
const ALLOWED_EVENTS = new Set(["PageView", "InitiateCheckout"]);

function json(payload, status = 200, extraHeaders = {}) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

function boundedString(value, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export function GET() {
  return json({ error: "Método não permitido" }, 405, { Allow: "POST" });
}

export async function POST(request) {
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accessToken) {
    return json({ error: "Conversions API não configurada" }, 503);
  }

  let input;

  try {
    input = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const eventName = boundedString(input.event_name, 64);
  const eventId = boundedString(input.event_id, 128);

  if (!ALLOWED_EVENTS.has(eventName) || !eventId) {
    return json({ error: "Evento inválido" }, 400);
  }

  const forwardedFor = boundedString(request.headers.get("x-forwarded-for"), 256);
  const userData = {
    client_ip_address: forwardedFor.split(",")[0].trim(),
    client_user_agent: boundedString(request.headers.get("user-agent"), 1024)
  };
  const fbp = boundedString(input.fbp, 256);
  const fbc = boundedString(input.fbc, 256);

  if (!userData.client_ip_address) delete userData.client_ip_address;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const metaPayload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      event_source_url: boundedString(input.event_source_url, 2048),
      user_data: userData
    }]
  };

  if (process.env.META_TEST_EVENT_CODE) {
    metaPayload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  const endpoint = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PIXEL_ID}/events`);
  endpoint.searchParams.set("access_token", accessToken);

  try {
    const metaResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metaPayload)
    });

    if (!metaResponse.ok) {
      console.error(`Meta Conversions API respondeu com status ${metaResponse.status}`);
      return json({ error: "Falha ao registrar evento" }, 502);
    }

    return json({ accepted: true }, 202);
  } catch (error) {
    console.error("Não foi possível acessar a Meta Conversions API:", error.message);
    return json({ error: "Falha ao registrar evento" }, 502);
  }
}
