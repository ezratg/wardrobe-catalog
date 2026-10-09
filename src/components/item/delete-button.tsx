"use client";

import { deleteItem } from "@/app/actions/items";

export function DeleteButton({ itemId }: { itemId: string }) {
  return (
    <form
      action={deleteItem.bind(null, itemId)}
      onSubmit={(e) => {
        if (!confirm("Delete this item and its photos? This can’t be undone.")) e.preventDefault();
      }}
    >
      <button className="text-sm text-muted underline hover:text-accent">Delete this item</button>
    </form>
  );
}
