import Link from "next/link";
import { toggleFavorite } from "@/app/actions/items";
import type { Item } from "@/db/schema";
import { displayName, imageUrl } from "@/lib/items";
import { categoryLabel, colorHex, colorLabel } from "@/lib/taxonomy";

export function ItemCard({ item }: { item: Item }) {
  const removing = item.bgStatus === "pending" || item.bgStatus === "processing";
  const processing = removing || item.tagStatus === "pending";
  return (
    <article className="group relative">
      <Link href={`/items/${item.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-tile">
          {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated, already-sized thumbnails */}
          <img
            src={imageUrl(item, "thumb")}
            alt={displayName(item)}
            loading="lazy"
            className={`absolute inset-0 size-full p-5 transition-transform duration-300 group-hover:scale-[1.03] ${item.hasCutout ? "object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.12)]" : "object-cover p-0"}`}
          />
          {processing && (
            <div className="absolute inset-0 flex items-end">
              <div className="shimmer absolute inset-0" />
              <span className="relative m-2 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-medium">{removing ? "Removing background…" : "Tagging…"}</span>
            </div>
          )}
          {item.bgStatus === "failed" && (
            <span className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-warn">Background not removed</span>
          )}
          {item.category === "uncategorized" && !processing && (
            <span className="absolute top-2 left-2 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-ink">Needs tags</span>
          )}
          {item.laundry === "laundry" && (
            <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-medium">In the laundry</span>
          )}
        </div>
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium">{displayName(item)}</h3>
            <p className="truncate text-xs text-muted">
              {[item.brand, item.category !== "uncategorized" ? categoryLabel(item.category) : null].filter(Boolean).join(" · ") || " "}
            </p>
          </div>
        </div>
        {item.colors.length > 0 && (
          <div className="mt-1.5 flex gap-1" aria-label={`Colours: ${item.colors.map(colorLabel).join(", ")}`}>
            {item.colors.map((c) => (
              <span key={c} className="size-3 rounded-full border border-black/15" style={{ background: colorHex(c) }} />
            ))}
          </div>
        )}
      </Link>
      <form action={toggleFavorite.bind(null, item.id)} className="absolute top-2 right-2">
        <button
          className="flex size-8 items-center justify-center rounded-full bg-surface/90 text-lg leading-none shadow-sm hover:scale-110"
          aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={item.favorite}
        >
          <span className={item.favorite ? "text-accent" : "text-muted"}>{item.favorite ? "♥" : "♡"}</span>
        </button>
      </form>
    </article>
  );
}
