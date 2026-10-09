import Link from "next/link";
import { Suspense } from "react";
import { Catalog } from "@/components/catalog/catalog";
import { GridSkeleton } from "@/components/catalog/grid-skeleton";
import { getCurrentUser } from "@/lib/auth/dal";
import { parseFilters } from "@/lib/items";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) return <Landing />;
  const filters = parseFilters(await searchParams);
  return <Catalog user={user} filters={filters} />;
}

function Landing() {
  return (
    <section className="mx-auto max-w-2xl py-16 text-center sm:py-24">
      <h1 className="font-display text-5xl leading-tight sm:text-6xl">Your closet, as a catalog.</h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-muted">
        Snap a photo of each piece. We remove the background and file it, so you can browse your
        own clothes like a store and plan what to wear.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/signup" className="btn-primary px-6 py-3">Get started</Link>
        <Link href="/login" className="btn-ghost px-6 py-3">Log in</Link>
      </div>
    </section>
  );
}
