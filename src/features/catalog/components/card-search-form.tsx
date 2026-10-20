import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Plain GET form → /cards?q=…&classic=1. Works without client JS. */
export function CardSearchForm({ q, classicOnly }: { q: string; classicOnly: boolean }) {
  return (
    <form action="/cards" method="get" role="search" className="grid gap-3 sm:flex sm:items-center">
      <label htmlFor="card-search-q" className="sr-only">
        Card name, ID, passcode or set code
      </label>
      <Input
        id="card-search-q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Dark Magician, 46986414 or LOB-005"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={100}
        className="h-11 text-base sm:flex-1"
      />
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" name="classic" value="1" defaultChecked={classicOnly} className="size-5" />
        Classic only
      </label>
      <Button type="submit" className="h-11 px-5">
        Search
      </Button>
    </form>
  );
}
