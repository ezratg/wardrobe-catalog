import Link from "next/link";
import type { CurrentUser } from "@/lib/auth/dal";
import { activeFilterCount, filtersToQuery, queryCatalog, type CatalogFilters } from "@/lib/items";
import { categoryLabel, colorLabel } from "@/lib/taxonomy";
import { FilterPanel } from "./filter-panel";
import { ItemCard } from "./item-card";
import { SortSelect } from "./sort-select";
import { StatusPoller } from "./status-poller";

export function Catalog({ user, filters }: { user: CurrentUser; filters: CatalogFilters }) {
  const { total, results, facets } = queryCatalog(user.id, filters);
  const pending = results.filter((i) => i.bgStatus === "pending" || i.bgStatus === "processing");
  const nActive = activeFilterCount(filters);

  if (total === 0) return <EmptyCloset name={user.name} />;

  const chips = [
    ...filters.category.map((v) => ({ key: "category" as const, value: v, label: categoryLabel(v) })),
    ...filters.color.map((v) => ({ key: "color" as const, value: v, label: colorLabel(v) })),
    ...filters.warmth.map((v) => ({ key: "warmth" as const, value: v, label: v[0].toUpperCase() + v.slice(1) })),
    ...filters.style.map((v) => ({ key: "style" as const, value: v, label: v })),
    ...filters.laundry.map((v) => ({ key: "laundry" as const, value: v, label: v })),
    ...(filters.favorites ? [{ key: "favorites" as const, value: "1", label: "Favorites" }] : []),
    ...(filters.q ? [{ key: "q" as const, value: "", label: `“${filters.q}”` }] : []),
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">{filters.category.length === 1 ? categoryLabel(filters.category[0]) : "All clothes"}</h1>
          <p className="mt-1 text-sm text-muted">
            {results.length === total ? `${total} pieces` : `${results.length} of ${total} pieces`}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <form action="/" className="flex-1 sm:w-64 sm:flex-none" role="search">
            {Object.entries(Object.fromEntries(new URLSearchParams(filtersToQuery({ ...filters, q: undefined }))))
              .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input className="input rounded-full" type="search" name="q" placeholder="Search your closet" defaultValue={filters.q} aria-label="Search" />
          </form>
          <SortSelect value={filters.sort} />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
        <aside className="mb-6 lg:mb-0">
          <details className="group rounded-xl border border-line bg-surface lg:border-0 lg:bg-transparent">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium lg:hidden">
              Filters{nActive ? ` (${nActive})` : ""}
              <span className="text-muted group-open:rotate-180">⌄</span>
            </summary>
            <div className="px-4 pb-4 lg:hidden">
              <FilterPanel filters={filters} facets={facets} />
            </div>
          </details>
          <div className="hidden lg:block">
            <FilterPanel filters={filters} facets={facets} />
          </div>
        </aside>

        <section>
          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <Link
                  key={`${c.key}:${c.value}`}
                  href={`/${filtersToQuery(filters, { key: c.key, value: c.value })}`}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-xs capitalize hover:border-ink"
                >
                  {c.label} <span aria-hidden className="ml-1 text-muted">×</span>
                  <span className="sr-only">remove filter</span>
                </Link>
              ))}
              <Link href="/" className="text-xs text-muted underline">Clear all</Link>
            </div>
          )}

          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-12 text-center text-muted">
              Nothing matches those filters. <Link href="/" className="text-ink underline">Clear filters</Link>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((item) => (
                <li key={item.id}><ItemCard item={item} /></li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {pending.length > 0 && <StatusPoller ids={pending.map((i) => i.id)} />}
    </div>
  );
}

function EmptyCloset({ name }: { name: string }) {
  return (
    <section className="mx-auto max-w-lg py-16 text-center">
      <h1 className="font-display text-4xl">Hi {name.split(" ")[0]}, let’s fill your closet.</h1>
      <p className="mt-3 text-muted">
        Lay a piece flat or hang it up, take a photo, and upload it. Backgrounds are removed automatically.
        You can add a whole batch at once.
      </p>
      <Link href="/upload" className="btn-primary mt-8 px-6 py-3">Add your first pieces</Link>
    </section>
  );
}
