import type { Score } from "@/lib/outfits/engine";

export function StyleNotes({ score, compact }: { score: Pick<Score, "reasons" | "warnings">; compact?: boolean }) {
  if (!score.reasons.length && !score.warnings.length) return null;
  return (
    <ul className={`space-y-1 ${compact ? "text-xs" : "text-sm"}`}>
      {score.reasons.map((r) => (
        <li key={r} className="flex gap-2"><span aria-hidden className="text-ok">✓</span><span>{r}</span></li>
      ))}
      {score.warnings.map((w) => (
        <li key={w} className="flex gap-2 text-muted"><span aria-hidden className="text-warn">!</span><span>{w}</span></li>
      ))}
    </ul>
  );
}
