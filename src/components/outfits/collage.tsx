import { SLOT_OF } from "@/lib/outfits/engine";

type CollageItem = { id: string; category: string; name: string; thumb: string };

/**
 * A flat-lay style arrangement: main pieces in a column on the left, shoes and
 * accessories smaller on the right. Works for 1–8 pieces.
 */
export function OutfitCollage({ items, className = "", onRemove }: { items: CollageItem[]; className?: string; onRemove?: (id: string) => void }) {
  const main = items.filter((i) => ["outer", "mid", "top", "dress", "bottom"].includes(SLOT_OF[i.category] ?? ""));
  const side = items.filter((i) => !main.includes(i));
  const Tile = ({ item, small }: { item: CollageItem; small?: boolean }) => {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element -- auth-gated thumbnails
      <img src={item.thumb} alt={item.name} className="size-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.12)]" />
    );
    return (
      <div className={`relative min-h-0 ${small ? "p-1" : "p-1.5"} flex-1`}>
        {onRemove ? (
          <button type="button" onClick={() => onRemove(item.id)} className="group size-full" aria-label={`Remove ${item.name}`}>
            {img}
            <span className="absolute top-1 right-1 hidden size-6 items-center justify-center rounded-full bg-surface text-xs shadow group-hover:flex group-focus-visible:flex">✕</span>
          </button>
        ) : img}
      </div>
    );
  };
  if (!items.length) {
    return <div className={`flex items-center justify-center rounded-2xl bg-tile text-sm text-muted ${className}`}>Pick pieces to start</div>;
  }
  return (
    <div className={`flex gap-1 rounded-2xl bg-tile p-3 ${className}`}>
      <div className={`flex min-h-0 flex-col ${side.length ? "w-3/5" : "w-full"}`}>
        {(main.length ? main : side).map((i) => <Tile key={i.id} item={i} />)}
      </div>
      {main.length > 0 && side.length > 0 && (
        <div className="flex min-h-0 w-2/5 flex-col justify-end">
          {side.map((i) => <Tile key={i.id} item={i} small />)}
        </div>
      )}
    </div>
  );
}
