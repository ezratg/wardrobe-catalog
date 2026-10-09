"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/taxonomy";

type Upload = {
  key: string;
  name: string;
  preview: string;
  state: "queued" | "uploading" | "processing" | "tagging" | "done" | "failed" | "error";
  label?: string;
  error?: string;
  itemId?: string;
};

const MAX_EDGE = 2000;

/** Downscale on the device before upload: faster on phones, and converts HEIC where the browser can decode it. */
async function prepare(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    return file; // let the server try
  }
}

export function Uploader({ autoTag }: { autoTag: boolean }) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [category, setCategory] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const patch = (key: string, p: Partial<Upload>) =>
    setUploads((us) => us.map((u) => (u.key === key ? { ...u, ...p } : u)));

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = [...files].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
      const added = list.map((f) => ({
        key: crypto.randomUUID(),
        name: f.name,
        preview: URL.createObjectURL(f),
        state: "queued" as const,
        file: f,
      }));
      setUploads((us) => [...added.map((a) => ({ key: a.key, name: a.name, preview: a.preview, state: a.state })), ...us]);
      // Upload one at a time, in order.
      for (const a of added) {
        queue.current = queue.current.then(async () => {
          patch(a.key, { state: "uploading" });
          try {
            const body = new FormData();
            body.append("file", await prepare(a.file), a.name.replace(/\.\w+$/, ".jpg"));
            if (category) body.append("category", category);
            const res = await fetch("/api/items", { method: "POST", body });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Upload failed");
            patch(a.key, { state: "processing", itemId: json.id });
          } catch (e) {
            patch(a.key, { state: "error", error: e instanceof Error ? e.message : "Upload failed" });
          }
        });
      }
    },
    [category],
  );

  // Poll background removal for uploaded items.
  const processingIds = uploads.filter((u) => (u.state === "processing" || u.state === "tagging") && u.itemId).map((u) => u.itemId!);
  const idsKey = processingIds.join(",");
  useEffect(() => {
    if (!idsKey) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/items/status?ids=${idsKey}`, { cache: "no-store" });
        const { items } = (await res.json()) as { items: { id: string; bgStatus: string; tagStatus: string; name: string; imageVersion: number }[] };
        setUploads((us) =>
          us.map((u) => {
            const s = items.find((i) => i.id === u.itemId);
            if (!s || (u.state !== "processing" && u.state !== "tagging")) return u;
            if (s.bgStatus === "pending" || s.bgStatus === "processing") return u;
            const preview = s.bgStatus === "done" ? `/api/images/${s.id}/thumb?v=${s.imageVersion}` : u.preview;
            if (s.tagStatus === "pending") return { ...u, state: "tagging", preview };
            return { ...u, state: s.bgStatus === "failed" ? "failed" : "done", preview, label: s.name || undefined };
          }),
        );
      } catch {}
    }, 2000);
    return () => clearInterval(t);
  }, [idsKey]);

  const done = uploads.filter((u) => u.state === "done" || u.state === "failed").length;
  const finished = (u: Upload) => u.state === "done" || u.state === "failed";

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {autoTag
          ? "Each piece is named and tagged automatically, so you can drop in your whole closet at once. The very first photo takes a minute longer while the free tagging model downloads."
          : "Auto-tagging is turned off, so you'll tag pieces yourself."}
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <label htmlFor="cat" className="text-muted">These are all</label>
        <select id="cat" className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{autoTag ? "Mixed (detect automatically)" : "Mixed (tag later)"}</option>
          {CATEGORIES.filter((c) => c.id !== "uncategorized").map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${dragging ? "border-ink bg-tile" : "border-line bg-surface hover:border-muted"}`}
      >
        <span className="font-display text-2xl">Drop photos here</span>
        <span className="mt-1 text-sm text-muted">or tap to choose from your camera roll</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="file-input"
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
      />

      {uploads.length > 0 && (
        <>
          <div className="mt-8 mb-3 flex items-center justify-between text-sm">
            <span className="text-muted">{done} of {uploads.length} ready</span>
            <Link href="/" className="font-medium underline">Go to my closet</Link>
          </div>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {uploads.map((u) => (
              <li key={u.key} className="text-xs">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local previews */}
                  <img src={u.preview} alt="" className={`absolute inset-0 size-full ${u.state === "done" ? "object-contain p-2" : "object-cover"}`} />
                  {!finished(u) && u.state !== "error" && <div className="shimmer absolute inset-0" />}
                </div>
                <div className="mt-1.5 truncate">
                  {finished(u) && u.itemId ? (
                    <Link href={`/items/${u.itemId}`} className={u.state === "done" ? "text-ok underline" : "text-warn underline"}>
                      {u.label ?? (u.state === "failed" ? "Kept original photo" : "Ready, add tags")}
                    </Link>
                  ) : (
                    <span className={u.state === "error" || u.state === "failed" ? "text-accent" : "text-muted"}>
                      {{ queued: "Waiting…", uploading: "Uploading…", processing: "Removing background…", tagging: "Tagging…", failed: "", error: u.error, done: "" }[u.state]}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
