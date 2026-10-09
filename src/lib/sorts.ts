// Client-safe catalog types (imported by client components too).

export type CatalogFilters = {
  q?: string;
  category: string[];
  color: string[];
  warmth: string[];
  style: string[];
  laundry: string[];
  favorites: boolean;
  sort: "newest" | "oldest" | "most-worn" | "least-worn" | "name";
};

export const SORTS: { id: CatalogFilters["sort"]; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "most-worn", label: "Most worn" },
  { id: "least-worn", label: "Least worn" },
  { id: "name", label: "Name" },
];

