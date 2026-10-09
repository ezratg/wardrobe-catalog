"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Tracked = { id: string; bgStatus: string; tagStatus: string };

/**
 * Polls photo processing (background removal, then auto-tagging) and
 * refreshes the page whenever an item moves to its next step.
 */
export function StatusPoller({ items }: { items: Tracked[] }) {
  const router = useRouter();
  const key = items.map((i) => `${i.id}:${i.bgStatus}/${i.tagStatus}`).join(",");
  useEffect(() => {
    const shown = new Map(key.split(",").map((s) => s.split(":") as [string, string]));
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/items/status?ids=${[...shown.keys()].join(",")}`, { cache: "no-store" });
        const { items: now } = (await res.json()) as { items: Tracked[] };
        // "processing" vs "pending" isn't worth a refresh; only real progress is.
        const norm = (s: string) => s.replace("processing", "pending");
        if (!stopped && now.some((i) => norm(`${i.bgStatus}/${i.tagStatus}`) !== norm(shown.get(i.id) ?? ""))) router.refresh();
      } catch {
        /* try again next tick */
      }
    };
    const t = setInterval(tick, 2500);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [key, router]);
  return null;
}
