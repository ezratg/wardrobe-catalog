"use client";

import { useActionState, useState } from "react";
import { saveItem, type SaveState } from "@/app/actions/items";
import type { Item } from "@/db/schema";
import { CATEGORIES, COLORS, FORMALITY, LAUNDRY, PATTERNS, STYLES, SUBCATEGORIES, WARMTH, type Category } from "@/lib/taxonomy";

export function ItemForm({ item }: { item: Item }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveItem.bind(null, item.id), undefined);
  const [category, setCategory] = useState(item.category);
  const [dirty, setDirty] = useState(false);
  const subs = SUBCATEGORIES[category as Category] ?? [];

  return (
    <form action={action} onChange={() => setDirty(true)} onSubmit={() => setDirty(false)} className="space-y-6" key={item.updatedAt.getTime()}>
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input className="input" id="name" name="name" defaultValue={item.name} placeholder="e.g. Navy linen shirt" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="category">Category</label>
          <select className="input" id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.id === "uncategorized" ? "Choose…" : c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="subcategory">Type</label>
          <input className="input" id="subcategory" name="subcategory" list="subcats" defaultValue={item.subcategory ?? ""} placeholder={subs[0] ?? ""} />
          <datalist id="subcats">{subs.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
      </div>

      <fieldset>
        <legend className="label">Colours {item.colorsConfirmed ? "" : <span className="normal-case tracking-normal">(detected from the photo)</span>}</legend>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <label key={c.id} title={c.label} className="cursor-pointer">
              <input type="checkbox" name="colors" value={c.id} defaultChecked={item.colors.includes(c.id)} className="peer sr-only" />
              <span className="sr-only">{c.label}</span>
              <span
                aria-hidden
                className="block size-8 rounded-full border border-black/15 ring-offset-2 ring-offset-bg peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-muted"
                style={{ background: c.hex }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="pattern">Pattern</label>
          <select className="input" id="pattern" name="pattern" defaultValue={item.pattern ?? ""}>
            <option value="">—</option>
            {PATTERNS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="formality">Dress code</label>
          <select className="input" id="formality" name="formality" defaultValue={item.formality ?? ""}>
            <option value="">—</option>
            {FORMALITY.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <ChipGroup legend="Good for weather" name="warmth" options={WARMTH.map((w) => ({ id: w.id, label: w.label, hint: w.hint }))} selected={item.warmth} />
      <ChipGroup legend="Style" name="styles" options={STYLES.map((s) => ({ id: s, label: s }))} selected={item.styles} />

      <fieldset>
        <legend className="label">Status</legend>
        <div className="flex flex-wrap gap-1.5">
          {LAUNDRY.map((l) => (
            <label key={l.id} className="cursor-pointer">
              <input type="radio" name="laundry" value={l.id} defaultChecked={item.laundry === l.id} className="peer sr-only" />
              <span className="block rounded-full border border-line bg-surface px-3 py-1.5 text-xs peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:ring-2 peer-focus-visible:ring-muted">{l.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="brand">Brand</label>
          <input className="input" id="brand" name="brand" defaultValue={item.brand ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="size">Size</label>
          <input className="input" id="size" name="size" defaultValue={item.size ?? ""} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea className="input min-h-20" id="notes" name="notes" defaultValue={item.notes ?? ""} placeholder="Fit, care, what it goes with…" />
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <button className="btn-primary px-6" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        {state?.error && <span role="alert" className="text-sm text-accent">{state.error}</span>}
        {state?.saved && !dirty && !pending && <span role="status" className="text-sm text-ok">Saved</span>}
      </div>
    </form>
  );
}

function ChipGroup({ legend, name, options, selected }: { legend: string; name: string; options: { id: string; label: string; hint?: string }[]; selected: string[] }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o.id} className="cursor-pointer" title={o.hint}>
            <input type="checkbox" name={name} value={o.id} defaultChecked={selected.includes(o.id)} className="peer sr-only" />
            <span className="block rounded-full border border-line bg-surface px-3 py-1.5 text-xs peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:ring-2 peer-focus-visible:ring-muted">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
