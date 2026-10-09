// A stand-in for the Anthropic Messages API used by the end-to-end test, so
// auto-tagging can be exercised without a real key or cost. It checks the
// request has the shape the app relies on, then "recognises" the synthetic
// fixture garments by their colour.
import http from "node:http";
import sharp from "sharp";

const PORT = Number(process.env.PORT ?? 3198);

const GARMENTS = [
  { rgb: [42, 77, 143], tags: { name: "Blue T-shirt", category: "top", subcategory: "T-shirt", colors: ["blue"], pattern: "Solid", formality: "casual", warmth: ["hot", "warm"], styles: ["Minimal"] } },
  { rgb: [28, 28, 28], tags: { name: "Black jeans", category: "bottom", subcategory: "Jeans", colors: ["black"], pattern: "Solid", formality: "casual", warmth: ["mild", "cold"], styles: ["Classic"] } },
  { rgb: [192, 49, 43], tags: { name: "Red skirt", category: "bottom", subcategory: "Skirt", colors: ["red"], pattern: "Solid", formality: "smart", warmth: ["hot"], styles: ["Romantic"] } },
];

async function averageGarmentColour(b64) {
  const { data, info } = await sharp(Buffer.from(b64, "base64")).resize(64, 64, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  let n = 0, r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) continue; // white backdrop
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  return n ? [r / n, g / n, b / n] : [255, 255, 255];
}

http
  .createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method !== "POST" || !req.url.startsWith("/v1/messages")) return send(404, { type: "error", error: { type: "not_found_error", message: "not found" } });
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);

    const problems = [];
    if (!req.headers["x-api-key"]) problems.push("missing api key");
    if (!String(req.headers["anthropic-beta"] ?? "").includes("server-side-fallback-2026-07-01")) problems.push("missing fallback beta header");
    if (body.fallbacks !== "default") problems.push("fallbacks should be 'default'");
    if (body.output_config?.format?.type !== "json_schema") problems.push("missing json_schema output format");
    const image = body.messages?.[0]?.content?.find((c) => c.type === "image");
    if (!image) problems.push("no image");
    if (problems.length) return send(400, { type: "error", error: { type: "invalid_request_error", message: problems.join("; ") } });

    const avg = await averageGarmentColour(image.source.data);
    const best = GARMENTS.map((g) => ({ g, d: g.rgb.reduce((s, v, i) => s + (v - avg[i]) ** 2, 0) })).sort((a, b) => a.d - b.d)[0].g;
    send(200, {
      id: `msg_mock_${Date.now()}`,
      type: "message",
      role: "assistant",
      model: body.model,
      content: [{ type: "text", text: JSON.stringify(best.tags) }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    });
  })
  .listen(PORT, () => console.log(`mock Anthropic API on :${PORT}`));
