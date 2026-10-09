import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { markWorn, retryBackground, toggleFavorite } from "@/app/actions/items";
import { StatusPoller } from "@/components/catalog/status-poller";
import { DeleteButton } from "@/components/item/delete-button";
import { ImageViewer } from "@/components/item/image-viewer";
import { ItemForm } from "@/components/item/item-form";
import { requireUser } from "@/lib/auth/dal";
import { displayName, getItem, imageUrl } from "@/lib/items";

export default function ItemPage({ params }: PageProps<"/items/[id]">) {
  return (
    <div>
      <Link href="/" className="text-sm text-muted hover:text-ink">← All clothes</Link>
      <Suspense fallback={<div className="mt-4 aspect-[4/5] max-w-md rounded-2xl bg-tile" />}>
        <ItemDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ItemDetail({ params }: Pick<PageProps<"/items/[id]">, "params">) {
  const user = await requireUser();
  const { id } = await params;
  const item = getItem(user.id, id);
  if (!item) notFound();
  const processing = item.bgStatus === "pending" || item.bgStatus === "processing";

  return (
    <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
      <div className="md:sticky md:top-20 md:self-start">
        <ImageViewer
          name={displayName(item)}
          cutout={item.hasCutout ? imageUrl(item, "cutout") : null}
          original={imageUrl(item, "original")}
          processing={processing}
        />
        {item.bgStatus === "failed" && (
          <form action={retryBackground.bind(null, item.id)} className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-warn">The background couldn’t be removed.</span>
            <button className="underline">Try again</button>
          </form>
        )}
      </div>

      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl leading-tight">{displayName(item)}</h1>
            <p className="mt-1 text-sm text-muted">
              Worn {item.wearCount} {item.wearCount === 1 ? "time" : "times"}
              {item.lastWornAt ? `, last on ${item.lastWornAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
            </p>
          </div>
          <form action={toggleFavorite.bind(null, item.id)}>
            <button className="btn-ghost size-10 p-0 text-xl" aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={item.favorite}>
              <span className={item.favorite ? "text-accent" : "text-muted"}>{item.favorite ? "♥" : "♡"}</span>
            </button>
          </form>
        </div>
        <div className="mt-4 flex gap-2">
          <form action={markWorn.bind(null, item.id)}>
            <button className="btn-ghost">Wore it today</button>
          </form>
          {item.category !== "uncategorized" && (
            <Link href={`/outfits/suggest?with=${item.id}`} className="btn-ghost">Style it</Link>
          )}
        </div>

        <hr className="my-8 border-line" />
        <ItemForm item={item} />
        <hr className="my-8 border-line" />
        <DeleteButton itemId={item.id} />
      </div>
      {processing && <StatusPoller ids={[item.id]} />}
    </div>
  );
}
