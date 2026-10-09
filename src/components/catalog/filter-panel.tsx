import Link from "next/link";
import { filtersToQuery, type CatalogFilters } from "@/lib/items";
import { CATEGORIES, COLORS, LAUNDRY, STYLES, WARMTH } from "@/lib/taxonomy";

type Facets = Record<"category" | "color" | "warmth" | "style" | "laundry", Record<string, number>>;

export function FilterPanel({ filters, facets }: { filters: CatalogFilters; facets: Facets }) {
  const href = (key: keyof CatalogFilters, value: string) => `/${filtersToQuery(filters, { key, value })}`;

  return (
    <div className="space-y-7 text-sm">
      <Group title="Category">
        <ul className="space-y-1">
          {CATEGORIES.filter((c) => facets.category[c.id] || filters.category.includes(c.id)).map((c) => {
            const on = filters.category.includes(c.id);
            return (
              <li key={c.id}>
                <Link href={href("category", c.id)} aria-pressed={on} className={`flex justify-between rounded-md py-1 hover:text-ink ${on ? "font-semibold text-ink" : "text-muted"}`}>
                  <span>{c.label}</span>
                  <span className="tabular-nums">{facets.category[c.id] ?? 0}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Group>

      <Group title="Colour">
        <div className="flex flex-wrap gap-2">
          {COLORS.filter((c) => facets.color[c.id] || filters.color.includes(c.id)).map((c) => {
            const on = filters.color.includes(c.id);
            return (
              <Link
                key={c.id}
                href={href("color", c.id)}
                title={`${c.label} (${facets.color[c.id] ?? 0})`}
                aria-label={`${c.label}, ${facets.color[c.id] ?? 0} items`}
                aria-pressed={on}
                className={`size-7 rounded-full border border-black/15 ring-offset-2 ring-offset-bg ${on ? "ring-2 ring-ink" : "hover:ring-1 hover:ring-muted"}`}
                style={{ background: c.hex }}
              />
            );
          })}
        </div>
      </Group>

      <Group title="Weather">
        <Pills options={WARMTH.map((w) => ({ id: w.id, label: w.label }))} selected={filters.warmth} counts={facets.warmth} href={(v) => href("warmth", v)} />
      </Group>

      {Object.keys(facets.style).length > 0 && (
        <Group title="Style">
          <Pills options={STYLES.map((s) => ({ id: s, label: s }))} selected={filters.style} counts={facets.style} href={(v) => href("style", v)} hideEmpty />
        </Group>
      )}

      <Group title="Status">
        <Pills options={LAUNDRY.map((l) => ({ id: l.id, label: l.label }))} selected={filters.laundry} counts={facets.laundry} href={(v) => href("laundry", v)} hideEmpty />
        <Link href={href("favorites", "1")} aria-pressed={filters.favorites} className={`mt-3 inline-flex items-center gap-1.5 ${filters.favorites ? "font-semibold" : "text-muted hover:text-ink"}`}>
          <span aria-hidden>{filters.favorites ? "♥" : "♡"}</span> Favorites only
        </Link>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="label mb-2.5">{title}</h2>
      {children}
    </div>
  );
}

function Pills({
  options, selected, counts, href, hideEmpty,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  counts: Record<string, number>;
  href: (v: string) => string;
  hideEmpty?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options
        .filter((o) => !hideEmpty || counts[o.id] || selected.includes(o.id))
        .map((o) => {
          const on = selected.includes(o.id);
          return (
            <Link
              key={o.id}
              href={href(o.id)}
              aria-pressed={on}
              className={`rounded-full border px-3 py-1 text-xs ${on ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink"} ${!counts[o.id] && !on ? "opacity-50" : ""}`}
            >
              {o.label}
            </Link>
          );
        })}
    </div>
  );
}
