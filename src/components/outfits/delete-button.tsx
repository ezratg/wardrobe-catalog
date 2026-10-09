"use client";

import { deleteOutfit } from "@/app/actions/outfits";

export function DeleteOutfitButton({ outfitId }: { outfitId: string }) {
  return (
    <form
      action={deleteOutfit.bind(null, outfitId)}
      onSubmit={(e) => {
        if (!confirm("Delete this outfit? The clothes stay in your closet.")) e.preventDefault();
      }}
    >
      <button className="text-sm text-muted underline hover:text-accent">Delete this outfit</button>
    </form>
  );
}
