// Internal domain types shared across features. Provider (YGOPRODeck) and DynamoDB
// shapes are normalized into these and never leak into the UI.
import type { Currency, Money } from "@/lib/money";

export type { Currency, Money };

// ---------- Catalog (PRD §7) ----------

/** Market price as returned by the catalog, in USD minor units. */
export type CatalogPrice = { amountMinor: number; currency: "USD"; source: string };

export type CardPrinting = {
  setName: string;
  setCode: string; // e.g. "LOB-005"
  rarity: string;
  rarityCode: string | null;
  /** Printing-specific price; null when missing or zero (treated as unavailable). */
  price: CatalogPrice | null;
};

export type Card = {
  id: number; // provider canonical card id (passcode) — the identity, never the name
  name: string;
  type: string; // "Normal Monster", "Spell Card", …
  frameType: string | null;
  description: string;
  race: string | null; // monster type / spell-trap subtype
  attribute: string | null;
  archetype: string | null;
  atk: number | null;
  def: number | null;
  level: number | null;
  imageUrl: string | null;
  imageUrlSmall: string | null;
  printings: CardPrinting[];
  /** General card market price (lowest available market source); null → unavailable. */
  marketPrice: CatalogPrice | null;
};

export type CardSummary = Pick<Card, "id" | "name" | "type" | "imageUrlSmall" | "attribute" | "race"> & {
  isClassic: boolean;
};

export type CardSet = {
  /** URL-safe id: the set code prefix, e.g. "LOB". */
  code: string;
  name: string;
  cardCount: number;
  releaseDate: string | null; // YYYY-MM-DD
  imageUrl: string | null;
  isClassic: boolean;
};

// ---------- Inventory (PRD §8) ----------

export const CONDITIONS = [
  "Mint",
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export type CardCopy = {
  copyId: string;
  cardId: number;
  cardName: string; // denormalized for listing without the provider
  printingSetCode: string | null; // optional printing (e.g. "LOB-005")
  printingRarity: string | null;
  condition: Condition;
  purchasePrice: Money | null;
  purchaseId: string | null; // set only via the purchase-link transaction
  acquiredAt: string | null; // YYYY-MM-DD
  notes: string;
  createdAt: string;
  updatedAt: string;
};

// ---------- Products & purchases (PRD §10, §11) ----------

export const PRODUCT_CATEGORIES = [
  "Starter Deck",
  "Structure Deck",
  "Legendary Deck",
  "Egyptian God Deck",
  "Booster Pack",
  "Booster Box",
  "Special Collection",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type Product = {
  productId: string;
  name: string;
  category: ProductCategory;
  purchaseDate: string | null;
  seller: string | null;
  price: Money | null;
  shipping: Money | null;
  status: "sealed" | "opened";
  purchaseId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseItemKind = "COPY" | "PRODUCT" | "MISC";

export type PurchaseItem = {
  purchaseId: string;
  kind: PurchaseItemKind;
  refId: string; // copyId, productId, or misc uuid
  description: string;
  amount: Money;
  createdAt: string;
};

export type Purchase = {
  purchaseId: string;
  date: string; // YYYY-MM-DD
  seller: string;
  currency: Currency; // every item in a purchase uses this currency
  subtotalMinor: number; // maintained transactionally from items
  shippingMinor: number; // kept separate from subtotal
  itemCount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

// ---------- Pricing (PRD §12) ----------

export type PriceBasis = "printing" | "card-estimate" | "unavailable";

/** Result of the §12 pricing priority. amount is null only when basis is "unavailable". */
export type PriceQuote =
  | { basis: "printing"; amount: Money; pricedAt: string; source: string }
  | { basis: "card-estimate"; amount: Money; pricedAt: string; source: string }
  | { basis: "unavailable"; amount: null; pricedAt: string | null; source: null };

// ---------- Wishlist (PRD §13) ----------

export type WishlistItem =
  | {
      kind: "CARD";
      cardId: number;
      cardName: string;
      desiredQuantity: number;
      notes: string;
      createdAt: string;
    }
  | {
      kind: "PRODUCT";
      wishId: string;
      name: string;
      category: ProductCategory;
      setCode: string | null;
      fulfilledByProductId: string | null;
      notes: string;
      createdAt: string;
    };
