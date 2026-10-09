export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { resumePending } = await import("@/lib/images/pipeline");
  const n = resumePending();
  if (n) console.log(`[bg] resuming background removal for ${n} photo(s)`);
}
