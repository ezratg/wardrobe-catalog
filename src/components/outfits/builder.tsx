"use client";

import { useMemo, useState, useTransition } from "react";
import { saveOutfit } from "@/app/actions/outfits";
import type { ClientItem } from "@/lib/outfits/data";
import { scoreOutfit, SLOT_OF, sortBySlot, type Slot } from "@/lib/outfits/engine";
import { OutfitCollage } from "./collage";
import { StyleNotes } from "./style-notes";

const TABS: { id: string; label: string; slots: Slot[] }[] = [
  { id: "all", label: "All", slots: [] },
  { id: "tops", label: "Tops", slots: ["top"] },
  { id: "bottoms", label: "Bottoms", slots: ["bottom"] },
  { id: "dresses", label: "Dresses", slots: ["dress"] },
  { id: "layers", label: "Layers", slots: ["outer", "mid"] },
  { id: "shoes", label: "Shoes", slots: ["shoes"] },
  { id: "extras", label: "Bags & accessories", slots: ["bag", "accessory"] },
];

export function OutfitBuilder({
  closet,
  initial,
}: {
  closet: ClientItem[];
  initial: { id?: string; name: string; occasion: string; itemIds: string[] };
}) {
  const [ids, setIds] = useState(initial.itemIds.filter((id) => closet.some((c) => c.id === id)));
  const [name, setName] = useState(initial.name);
  const [occasion, setOccasion] = useState(initial.occasion);
  const [tab, setTab] = useState("all");
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const chosen = useMemo(() => sortBySlot(ids.map((id) => closet.find((c) => c.id === id)!).filter(Boolean)), [ids, closet]);
  const check = useMemo(() => scoreOutfit(chosen), [chosen]);
  const slots = TABS.find((t) => t.id === tab)!.slots;
  const visible = closet.filter((c) => !slots.length || slots.includes(SLOT_OF[c.category]!));

  const toggle = (item: ClientItem) => {
    setError(undefined);
    setIds((cur) => {
      if (cur.includes(item.id)) return cur.filter((id) => id !== item.id);
      const slot = SLOT_OF[item.category];
      // Picking a second piece for a single slot swaps it in (accessories can stack).
      let next = slot === "accessory" ? cur : cur.filter((id) => SLOT_OF[closet.find((c) => c.id === id)?.category ?? ""] !== slot);
      // A dress replaces a top + bottom, and the other way round.
      if (slot === "dress") next = next.filter((id) => !["top", "bottom"].includes(SLOT_OF[closet.find((c) => c.id === id)!.category]!));
      if (slot === "top" || slot === "bottom") next = next.filter((id) => SLOT_OF[closet.find((c) => c.id === id)!.category] !== "dress");
      return [...next, item.id];
    });
  };

  const save = () =>
    startSaving(async () => {
      const res = await saveOutfit({ id: initial.id, name, occasion, itemIds: ids });
      if (res?.error) setError(res.error);
    });

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="min-w-0 md:sticky md:top-20 md:self-start">
        <OutfitCollage items={chosen} className={`mx-auto md:aspect-[4/5] md:h-auto ${chosen.length ? "aspect-[4/5] max-h-[55vh]" : "h-40"}`} onRemove={(id) => setIds((c) => c.filter((x) => x !== id))} />
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="outfit-name">Name</label>
              <input id="outfit-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Friday dinner" />
            </div>
            <div>
              <label className="label" htmlFor="outfit-occasion">Occasion</label>
              <input id="outfit-occasion" className="input" value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Date night" />
            </div>
          </div>
          {chosen.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-3">
              <h2 className="label mb-2">Style check</h2>
              <StyleNotes score={check} />
            </div>
          )}
          <div className="flex items-center gap-3">
            <button type="button" className="btn-primary px-6" onClick={save} disabled={saving || !ids.length}>
              {saving ? "Saving…" : initial.id ? "Save changes" : "Save outfit"}
            </button>
            {error && <span role="alert" className="text-sm text-accent">{error}</span>}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Filter pieces">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${tab === t.id ? "border-ink bg-ink text-bg" : "border-line bg-surface"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
            Nothing tagged here yet. Items need a category before they show up in outfits.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {visible.map((c) => {
              const on = ids.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    aria-pressed={on}
                    aria-label={c.name}
                    className={`relative block aspect-square w-full overflow-hidden rounded-xl bg-tile ring-offset-2 ring-offset-bg ${on ? "ring-2 ring-ink" : "hover:ring-1 hover:ring-muted"} ${c.laundry === "laundry" ? "opacity-50" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated thumbnails */}
                    <img src={c.thumb} alt="" className="size-full object-contain p-2" />
                    {on && <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-[10px] text-bg">✓</span>}
                  </button>
                  <div className="mt-1 truncate text-xs text-muted">{c.name}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
