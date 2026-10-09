import { Suspense } from "react";
import { Uploader } from "@/components/uploader";
import { requireUser } from "@/lib/auth/dal";

export const metadata = { title: "Add clothes" };

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl">Add clothes</h1>
      <p className="mt-1 mb-8 text-muted">
        One piece per photo works best. Lay it flat or hang it against a plain wall. You can tag
        everything afterwards.
      </p>
      <Suspense fallback={<div className="h-64 rounded-2xl bg-tile" />}>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  await requireUser();
  return <Uploader />;
}
