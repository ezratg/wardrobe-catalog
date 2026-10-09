"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORTS, type CatalogFilters } from "@/lib/sorts";

export function SortSelect({ value }: { value: CatalogFilters["sort"] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      aria-label="Sort"
      className="input w-auto rounded-full pr-8"
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value === "newest") next.delete("sort");
        else next.set("sort", e.target.value);
        const qs = next.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
      }}
    >
      {SORTS.map((s) => (
        <option key={s.id} value={s.id}>{s.label}</option>
      ))}
    </select>
  );
}
