const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const host = "127.0.0.1";
const port = Number(process.env.PORT) || 3000;
const root = __dirname;
const metaPixelId = "1562627931838707";
const metaGraphApiVersion = process.env.META_GRAPH_API_VERSION || "v24.0";
const allowedMetaEvents = new Set(["PageView", "InitiateCheckout"]);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 16_384) {
        reject(new Error("Payload muito grande"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("JSON inválido"));
      }
    });
    request.on("error", reject);
  });
}

function boundedString(value, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

async function handleMetaEvent(request, response) {
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accessToken) {
    sendJson(response, 503, { error: "Conversions API não configurada" });
    return;
  }

  let input;

  try {
    input = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const eventName = boundedString(input.event_name, 64);
  const eventId = boundedString(input.event_id, 128);

  if (!allowedMetaEvents.has(eventName) || !eventId) {
    sendJson(response, 400, { error: "Evento inválido" });
    return;
  }

  const forwardedFor = boundedString(request.headers["x-forwarded-for"], 256);
  const clientIpAddress = forwardedFor.split(",")[0].trim() || request.socket.remoteAddress;
  const userData = {
    client_ip_address: clientIpAddress,
    client_user_agent: boundedString(request.headers["user-agent"], 1024)
  };
  const fbp = boundedString(input.fbp, 256);
  const fbc = boundedString(input.fbc, 256);

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

  const endpoint = new URL(`https://graph.facebook.com/${metaGraphApiVersion}/${metaPixelId}/events`);
  endpoint.searchParams.set("access_token", accessToken);

  try {
    const metaResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metaPayload)
    });

    if (!metaResponse.ok) {
      console.error(`Meta Conversions API respondeu com status ${metaResponse.status}`);
      sendJson(response, 502, { error: "Falha ao registrar evento" });
      return;
    }

    sendJson(response, 202, { accepted: true });
  } catch (error) {
    console.error("Não foi possível acessar a Meta Conversions API:", error.message);
    sendJson(response, 502, { error: "Falha ao registrar evento" });
  }
}

const server = http.createServer((request, response) => {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
  } catch {
    response.writeHead(400).end("Requisição inválida");
    return;
  }

  if (pathname === "/api/meta-event") {
    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST" }).end();
      return;
    }

    handleMetaEvent(request, response);
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, relativePath);

  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Acesso negado");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404).end("Arquivo não encontrado");
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(port, host, () => {
  console.log(`Bidion rodando em http://${host}:${port}`);
});
