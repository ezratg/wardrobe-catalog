"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Polls background-removal status and refreshes the page when any photo finishes. */
export function StatusPoller({ ids }: { ids: string[] }) {
  const router = useRouter();
  const key = ids.join(",");
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/items/status?ids=${key}`, { cache: "no-store" });
        const { items } = (await res.json()) as { items: { id: string; bgStatus: string }[] };
        if (!stopped && items.some((i) => i.bgStatus === "done" || i.bgStatus === "failed")) router.refresh();
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
