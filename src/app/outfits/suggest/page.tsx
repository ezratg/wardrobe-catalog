import Link from "next/link";
import { Suspense } from "react";
import { saveSuggestion } from "@/app/actions/outfits";
import { GridSkeleton } from "@/components/catalog/grid-skeleton";
import { OutfitCollage } from "@/components/outfits/collage";
import { StyleNotes } from "@/components/outfits/style-notes";
import { requireUser } from "@/lib/auth/dal";
import { getStylableCloset, toClientItem } from "@/lib/outfits/data";
import { suggestOutfits } from "@/lib/outfits/engine";
import { FORMALITY, STYLES } from "@/lib/taxonomy";

export const metadata = { title: "Outfit ideas" };

type SP = Record<string, string | string[] | undefined>;
const str = (v: SP[string]) => (typeof v === "string" ? v : undefined);

export default function SuggestPage({ searchParams }: PageProps<"/outfits/suggest">) {
  return (
    <div>
      <Link href="/outfits" className="text-sm text-muted hover:text-ink">← Outfits</Link>
      <h1 className="mt-2 font-display text-4xl">Outfit ideas</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Combinations from your closet, picked using colour, pattern, dress code and style rules. Pieces in the laundry are skipped.</p>
      <Suspense fallback={<GridSkeleton />}>
        <Suggestions searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Suggestions({ searchParams }: Pick<PageProps<"/outfits/suggest">, "searchParams">) {
  const user = await requireUser();
  const sp = await searchParams;
  const formality = str(sp.formality);
  const style = str(sp.style);
  const withId = str(sp.with);
  const seed = Number(str(sp.seed) ?? 1) || 1;

  const closet = getStylableCloset(user.id);
  const byId = new Map(closet.map((i) => [i.id, toClientItem(i)]));
  const anchor = withId ? byId.get(withId) : undefined;
  const { suggestions, missing } = suggestOutfits([...byId.values()], { formality, style, withItemId: anchor?.id, seed, count: 6 });

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { formality, style, with: anchor?.id, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/outfits/suggest${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs ${on ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink"}`;

  return (
    <div>
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label mr-1 mb-0">Dress code</span>
          {FORMALITY.map((f) => (
            <Link key={f.id} href={href({ formality: formality === f.id ? undefined : f.id, seed: undefined })} className={chip(formality === f.id)} aria-pressed={formality === f.id}>{f.label}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label mr-1 mb-0">Style</span>
          {STYLES.map((s) => (
            <Link key={s} href={href({ style: style === s ? undefined : s, seed: undefined })} className={chip(style === s)} aria-pressed={style === s}>{s}</Link>
          ))}
        </div>
        {anchor && (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-4 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated thumbnail */}
            <img src={anchor.thumb} alt="" className="size-12 rounded-lg bg-tile object-contain p-1" />
            <span className="flex-1">Built around <strong>{anchor.name}</strong></span>
            <Link href={href({ with: undefined, seed: undefined })} className="text-xs text-muted underline">Remove</Link>
          </div>
        )}
      </div>

      {suggestions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-sm text-muted">
          {missing.length ? (
            <>To suggest outfits, tag at least one top and one bottom (or a dress). Missing: {missing.join(" and ")}.{" "}
              <Link href="/" className="text-ink underline">Go to your closet</Link></>
          ) : (
            <>Nothing fits those filters. <Link href="/outfits/suggest" className="text-ink underline">Clear filters</Link></>
          )}
        </div>
      ) : (
        <>
          {missing.includes("shoes") && <p className="mb-4 text-sm text-muted">Tip: tag some shoes to complete these looks.</p>}
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((s, n) => {
              const items = s.itemIds.map((id) => byId.get(id)!);
              return (
                <li key={s.itemIds.join()} data-testid="suggestion">
                  <OutfitCollage items={items} className="aspect-[4/5]" />
                  <div className="mt-3">
                    <StyleNotes score={s} compact />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <form action={saveSuggestion}>
                      <input type="hidden" name="itemIds" value={s.itemIds.join(",")} />
                      <input type="hidden" name="name" value={`${style ?? FORMALITY.find((f) => f.id === formality)?.label ?? "Outfit"} idea ${n + 1}`} />
                      <button className="btn-primary">Save</button>
                    </form>
                    <Link href={`/outfits/new?items=${s.itemIds.join(",")}`} className="btn-ghost">Customize</Link>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-10 text-center">
            <Link href={href({ seed: String(seed + 1) })} className="btn-ghost px-6">Shuffle for more ideas</Link>
          </div>
        </>
      )}
    </div>
  );
}
