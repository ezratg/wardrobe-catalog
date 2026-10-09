
/**
 * Background removal. Runs locally with IMG.LY's open-source model (AGPL-3.0),
 * so there's no per-image cost or API key. The model loads on first use
 * (a few seconds), then each photo takes roughly 1–5s on a laptop CPU.
 * To switch to a hosted API later, replace this one function.
 */
export async function removeBackground(image: Buffer): Promise<Buffer> {
  const { removeBackground: run } = await import("@imgly/background-removal-node");
  const blob = await run(new Blob([new Uint8Array(image)], { type: "image/jpeg" }), {
    model: "medium",
    output: { format: "image/png" },
  });
  return Buffer.from(await blob.arrayBuffer());
}
