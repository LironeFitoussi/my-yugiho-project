/**
 * Single-table key builders for `yugioh-collection` (PRD §16). All PK/SK/GSI1 strings
 * are built here and nowhere else.
 *
 * | Entity         | PK            | SK                                        | GSI1PK / GSI1SK                                   |
 * | CARD_COPY      | USER#OWNER    | CARD#<cardId>#COPY#<copyId>               | USER#OWNER#COPIES / ACQ#<date>#<createdAt>#<copyId> |
 * | PRODUCT        | USER#OWNER    | PRODUCT#<id>                              | USER#OWNER#PRODUCTS / DATE#<purchaseDate>#<id>    |
 * | PURCHASE       | USER#OWNER    | PURCHASE#<id>                             | USER#OWNER#PURCHASES / DATE#<date>#<id>           |
 * | PURCHASE_ITEM  | USER#OWNER    | PURCHASE#<id>#ITEM#COPY#<copyId> | #ITEM#PRODUCT#<productId> | #ITEM#MISC#<uuid> | — |
 * | WISHLIST       | USER#OWNER    | WISHLIST#CARD#<cardId> / WISHLIST#PRODUCT#<id> | —                                            |
 * | CARD_CACHE     | CATALOG#CARD  | ID#<cardId>                               | —                                                 |
 * | PRICE_SNAPSHOT | PRICE#<cardId>| DATE#<YYYY-MM-DD>                         | —                                                 |
 * | FX_RATE        | FX#USD#ILS    | DATE#<YYYY-MM-DD>                         | —                                                 |
 *
 * Access patterns:
 * - Copies of card X            → Query base, begins_with(SK, cardCopyPrefix(X))  (prefix ends in '#')
 * - All copies / owned card IDs → Query base, begins_with(SK, "CARD#"), paged
 * - Recent acquisitions         → Query GSI1 desc on USER#OWNER#COPIES
 * - Products / purchases list   → Query GSI1 desc on USER#OWNER#PRODUCTS / #PURCHASES (never base begins_with PURCHASE#, which includes items)
 * - One purchase + its items    → Query base, begins_with(SK, purchaseSk(id)) — header sorts first
 * - Wishlist                    → Query base, begins_with(SK, "WISHLIST#")
 * - Cached card / current price → BatchGet CARD_CACHE (≤100 keys)
 * - Price history / latest FX   → Query desc on PRICE#<id> / FX#USD#ILS
 *
 * Every item also stores `entityType`, `createdAt`, `updatedAt` (ISO-8601 UTC).
 */

export const OWNER_PK = "USER#OWNER";

export type EntityType =
  | "CARD_COPY"
  | "PRODUCT"
  | "PURCHASE"
  | "PURCHASE_ITEM"
  | "WISHLIST"
  | "CARD_CACHE"
  | "PRICE_SNAPSHOT"
  | "FX_RATE";

/** Canonical card id string — strips leading zeros so passcode "00423585" and id 423585 match. */
export function cardKeyId(cardId: number | string): string {
  const n = Number(cardId);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`Invalid card id: ${cardId}`);
  return String(n);
}

// CARD_COPY
export const CARD_COPY_PREFIX = "CARD#";
export const cardCopyPrefix = (cardId: number | string) => `CARD#${cardKeyId(cardId)}#COPY#`;
export const cardCopySk = (cardId: number | string, copyId: string) => `${cardCopyPrefix(cardId)}${copyId}`;
export const COPIES_GSI1PK = `${OWNER_PK}#COPIES`;
export const copyGsi1Sk = (acquiredDate: string, createdAt: string, copyId: string) =>
  `ACQ#${acquiredDate}#${createdAt}#${copyId}`;

/** Extracts the card id from a CARD_COPY sort key. */
export function cardIdFromCopySk(sk: string): number {
  const match = /^CARD#(\d+)#COPY#/.exec(sk);
  if (!match) throw new Error(`Not a card copy SK: ${sk}`);
  return Number(match[1]);
}

// PRODUCT
export const productSk = (productId: string) => `PRODUCT#${productId}`;
export const PRODUCTS_GSI1PK = `${OWNER_PK}#PRODUCTS`;
export const productGsi1Sk = (purchaseDate: string, productId: string) => `DATE#${purchaseDate}#${productId}`;

// PURCHASE + PURCHASE_ITEM
export const purchaseSk = (purchaseId: string) => `PURCHASE#${purchaseId}`;
export const PURCHASES_GSI1PK = `${OWNER_PK}#PURCHASES`;
export const purchaseGsi1Sk = (date: string, purchaseId: string) => `DATE#${date}#${purchaseId}`;
export const purchaseItemPrefix = (purchaseId: string) => `${purchaseSk(purchaseId)}#ITEM#`;
export const purchaseCopyItemSk = (purchaseId: string, copyId: string) =>
  `${purchaseItemPrefix(purchaseId)}COPY#${copyId}`;
export const purchaseProductItemSk = (purchaseId: string, productId: string) =>
  `${purchaseItemPrefix(purchaseId)}PRODUCT#${productId}`;
export const purchaseMiscItemSk = (purchaseId: string, itemId: string) =>
  `${purchaseItemPrefix(purchaseId)}MISC#${itemId}`;

// WISHLIST
export const WISHLIST_PREFIX = "WISHLIST#";
export const wishlistCardSk = (cardId: number | string) => `WISHLIST#CARD#${cardKeyId(cardId)}`;
export const wishlistProductSk = (wishId: string) => `WISHLIST#PRODUCT#${wishId}`;

// CARD_CACHE
export const CATALOG_CARD_PK = "CATALOG#CARD";
export const cardCacheSk = (cardId: number | string) => `ID#${cardKeyId(cardId)}`;

// PRICE_SNAPSHOT
export const pricePk = (cardId: number | string) => `PRICE#${cardKeyId(cardId)}`;
export const dateSk = (date: string) => `DATE#${date}`;

// FX_RATE
export const fxPk = (base: string, quote: string) => `FX#${base}#${quote}`;

export const nowIso = () => new Date().toISOString();
export const todayUtc = () => new Date().toISOString().slice(0, 10);
