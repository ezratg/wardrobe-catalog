export function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] rounded-xl bg-tile" />
          <div className="mt-3 h-4 w-2/3 rounded bg-tile" />
        </div>
      ))}
    </div>
  );
}
