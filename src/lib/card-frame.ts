/**
 * Card-frame colours (presentational only). Maps a YGOPRODeck `frameType`
 * (e.g. "effect", "xyz_pendulum") or, when that's missing, the card `type`
 * string (e.g. "Fusion Monster", "Spell Card") to Tailwind classes for the
 * thin coloured frame drawn around a card tile's image.
 */
export type FrameKind =
  | "normal"
  | "effect"
  | "ritual"
  | "fusion"
  | "synchro"
  | "xyz"
  | "link"
  | "spell"
  | "trap"
  | "token"
  | "skill"
  | "unknown";

const BASE: Record<FrameKind, string> = {
  normal: "from-amber-200 to-amber-500",
  effect: "from-orange-400 to-orange-700",
  ritual: "from-sky-400 to-blue-700",
  fusion: "from-violet-400 to-purple-800",
  synchro: "from-zinc-50 to-zinc-400",
  xyz: "from-zinc-800 to-zinc-950 ring-1 ring-amber-400/70",
  link: "from-blue-700 to-blue-950",
  spell: "from-teal-400 to-emerald-700",
  trap: "from-pink-500 to-fuchsia-800",
  token: "from-zinc-400 to-zinc-600",
  skill: "from-sky-300 to-blue-500",
  unknown: "from-gold/70 to-gold-deep/50",
};

/** Pendulum frames: top half keeps the monster colour, bottom half fades to spell teal. */
const PENDULUM: Partial<Record<FrameKind, string>> = {
  normal: "from-amber-300 via-amber-300 to-teal-500",
  effect: "from-orange-500 via-orange-500 to-teal-500",
  ritual: "from-blue-500 via-blue-500 to-teal-500",
  fusion: "from-violet-500 via-violet-500 to-teal-500",
  synchro: "from-zinc-200 via-zinc-200 to-teal-500",
  xyz: "from-zinc-900 via-zinc-900 to-teal-500 ring-1 ring-amber-400/70",
};

function kindFrom(text: string): FrameKind {
  const t = text.toLowerCase();
  if (t.includes("spell")) return "spell";
  if (t.includes("trap")) return "trap";
  if (t.includes("token")) return "token";
  if (t.includes("skill")) return "skill";
  if (t.includes("link")) return "link";
  if (t.includes("xyz")) return "xyz";
  if (t.includes("synchro")) return "synchro";
  if (t.includes("fusion")) return "fusion";
  if (t.includes("ritual")) return "ritual";
  if (t.includes("normal")) return "normal";
  if (t.includes("effect") || t.includes("monster")) return "effect";
  return "unknown";
}

export function frameInfo(frameType: string | null | undefined, type?: string | null) {
  const source = frameType?.trim() || type?.trim() || "";
  return { kind: kindFrom(source), pendulum: /pendulum/i.test(source) };
}

/** Tailwind gradient classes for the card frame; pair with `bg-linear-to-b`. */
export function frameClass(frameType: string | null | undefined, type?: string | null): string {
  const { kind, pendulum } = frameInfo(frameType, type);
  return (pendulum && PENDULUM[kind]) || BASE[kind];
}
