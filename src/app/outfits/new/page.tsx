import Link from "next/link";
import { Suspense } from "react";
import { OutfitBuilder } from "@/components/outfits/builder";
import { requireUser } from "@/lib/auth/dal";
import { getStylableCloset, toClientItem } from "@/lib/outfits/data";

export const metadata = { title: "Build an outfit" };

export default function NewOutfitPage({ searchParams }: PageProps<"/outfits/new">) {
  return (
    <div>
      <Link href="/outfits" className="text-sm text-muted hover:text-ink">← Outfits</Link>
      <h1 className="mt-2 mb-6 font-display text-4xl">Build an outfit</h1>
      <Suspense fallback={<div className="aspect-[4/5] max-w-sm rounded-2xl bg-tile" />}>
        <Builder searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Builder({ searchParams }: Pick<PageProps<"/outfits/new">, "searchParams">) {
  const user = await requireUser();
  const sp = await searchParams;
  // ?items=a,b,c pre-fills the builder (used by "Customize" on a suggestion).
  const itemIds = typeof sp.items === "string" ? sp.items.split(",").filter(Boolean) : [];
  const closet = getStylableCloset(user.id).map(toClientItem);
  return <OutfitBuilder closet={closet} initial={{ name: "", occasion: "", itemIds }} />;
}
