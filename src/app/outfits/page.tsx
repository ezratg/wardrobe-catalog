import Link from "next/link";
import { Suspense } from "react";
import { OutfitCollage } from "@/components/outfits/collage";
import { GridSkeleton } from "@/components/catalog/grid-skeleton";
import { requireUser } from "@/lib/auth/dal";
import { listOutfits, toClientItem } from "@/lib/outfits/data";

export const metadata = { title: "Outfits" };

export default function OutfitsPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl">Outfits</h1>
        <div className="flex gap-2">
          <Link href="/outfits/suggest" className="btn-ghost">Suggest outfits</Link>
          <Link href="/outfits/new" className="btn-primary">Build an outfit</Link>
        </div>
      </div>
      <Suspense fallback={<GridSkeleton />}>
        <OutfitList />
      </Suspense>
    </div>
  );
}

async function OutfitList() {
  const user = await requireUser();
  const outfits = listOutfits(user.id);
  if (!outfits.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
        <p className="font-display text-2xl">No outfits yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Put pieces together yourself, or let the app suggest combinations from what’s in your closet.
        </p>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
      {outfits.map((o) => (
        <li key={o.id}>
          <Link href={`/outfits/${o.id}`} className="group block">
            <OutfitCollage items={o.items.map(toClientItem)} className="aspect-[4/5] transition-transform group-hover:scale-[1.01]" />
            <h2 className="mt-3 truncate text-sm font-medium">{o.name || "Untitled outfit"}</h2>
            <p className="truncate text-xs text-muted">
              {[o.occasion, `${o.items.length} pieces`, o.wornAt ? `worn ${o.wornAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : null].filter(Boolean).join(" · ")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
