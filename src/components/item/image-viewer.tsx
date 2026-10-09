"use client";

import { useState } from "react";

export function ImageViewer({ name, cutout, original, processing }: { name: string; cutout: string | null; original: string; processing: boolean }) {
  const [view, setView] = useState<"cutout" | "original">(cutout ? "cutout" : "original");
  const src = view === "cutout" && cutout ? cutout : original;
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-tile">
        {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated image route */}
        <img
          src={src}
          alt={name}
          className={`absolute inset-0 size-full ${src === cutout ? "object-contain p-8 drop-shadow-[0_12px_18px_rgba(0,0,0,0.15)]" : "object-cover"}`}
        />
        {processing && (
          <div className="absolute inset-0 flex items-end">
            <div className="shimmer absolute inset-0" />
            <span className="relative m-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-medium">Removing background…</span>
          </div>
        )}
      </div>
      {cutout && (
        <div className="mt-3 inline-flex rounded-full border border-line bg-surface p-0.5 text-xs" role="group" aria-label="Photo view">
          {(["cutout", "original"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-full px-3 py-1 ${view === v ? "bg-ink text-bg" : "text-muted"}`}
            >
              {v === "cutout" ? "Cut out" : "Original photo"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
