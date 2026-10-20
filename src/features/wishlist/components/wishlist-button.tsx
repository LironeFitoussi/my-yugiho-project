import { HeartIcon } from "lucide-react";
import Link from "next/link";

import { getCardWish } from "../queries";
import { AddToWishlistForm } from "./add-to-wishlist-form";

/**
 * Card-page wishlist control. Server component: reads the card's wishlist entry, then shows either
 * an "Add to wishlist" button or a link to the existing entry. Render inside <Suspense>.
 */
export async function WishlistButton({ cardId }: { cardId: number }) {
  const wish = await getCardWish(cardId);
  if (wish) {
    return (
      <Link
        href={`/wishlist?kind=card&q=${encodeURIComponent(wish.cardName)}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
      >
        <HeartIcon className="size-4 fill-current" aria-hidden />
        On wishlist · want {wish.desiredQuantity}
      </Link>
    );
  }
  return <AddToWishlistForm cardId={cardId} />;
}
