import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/features/products/components/fields";

import type { WishlistFilters as Filters } from "../schemas";

/** GET form: filters live in the URL (searchParams), so they work without JavaScript. */
export function WishlistFilters({ filters }: { filters: Filters }) {
  return (
    <form method="get" action="/wishlist" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="wish-q">Search</Label>
        <Input id="wish-q" name="q" type="search" defaultValue={filters.q} placeholder="Name, notes, set code…" className="h-11" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:contents">
        <div className="grid gap-1.5">
          <Label htmlFor="wish-kind">Type</Label>
          <NativeSelect id="wish-kind" name="kind" defaultValue={filters.kind}>
            <option value="all">All</option>
            <option value="card">Cards</option>
            <option value="product">Products</option>
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="wish-status">Status</Label>
          <NativeSelect id="wish-status" name="status" defaultValue={filters.status}>
            <option value="all">All</option>
            <option value="wanted">Wanted</option>
            <option value="owned">Owned</option>
          </NativeSelect>
        </div>
      </div>
      <Button type="submit" variant="secondary" className="h-11 px-4">
        Apply
      </Button>
    </form>
  );
}
