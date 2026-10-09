import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { wearOutfit } from "@/app/actions/outfits";
import { OutfitBuilder } from "@/components/outfits/builder";
import { DeleteOutfitButton } from "@/components/outfits/delete-button";
import { requireUser } from "@/lib/auth/dal";
import { getOutfit, getStylableCloset, toClientItem } from "@/lib/outfits/data";

export default function OutfitPage({ params }: PageProps<"/outfits/[id]">) {
  return (
    <div>
      <Link href="/outfits" className="text-sm text-muted hover:text-ink">← Outfits</Link>
      <Suspense fallback={<div className="mt-4 aspect-[4/5] max-w-sm rounded-2xl bg-tile" />}>
        <OutfitDetail params={params} />
      </Suspense>
    </div>
  );
}

async function OutfitDetail({ params }: Pick<PageProps<"/outfits/[id]">, "params">) {
  const user = await requireUser();
  const { id } = await params;
  const outfit = getOutfit(user.id, id);
  if (!outfit) notFound();
  const closet = getStylableCloset(user.id).map(toClientItem);

  return (
    <div>
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">{outfit.name || "Untitled outfit"}</h1>
          {outfit.wornAt && (
            <p className="mt-1 text-sm text-muted">
              Last worn {outfit.wornAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
        <form action={wearOutfit.bind(null, outfit.id)}>
          <button className="btn-ghost">Wearing this today</button>
        </form>
      </div>
      <OutfitBuilder
        key={outfit.items.map((i) => i.id).join()}
        closet={closet}
        initial={{ id: outfit.id, name: outfit.name, occasion: outfit.occasion ?? "", itemIds: outfit.items.map((i) => i.id) }}
      />
      <hr className="my-8 border-line" />
      <DeleteOutfitButton outfitId={outfit.id} />
    </div>
  );
}
