// CONTRACT STUB — owned by the Collection agent (Wave 1 B).
// Rendered by the Catalog agent on /cards/[id]: shows owned copies of this card and an "Add copy" form.
import type { Card } from "@/types";

export type CardCollectionPanelProps = {
  card: Pick<Card, "id" | "name" | "printings">;
};

export async function CardCollectionPanel({ card }: CardCollectionPanelProps) {
  void card;
  return null;
}
