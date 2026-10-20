"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Emblem } from "@/components/shared/emblem";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { NAV_ITEMS, isActive } from "./nav-items";

/** Desktop sidebar (md and up). */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="hidden md:sticky md:top-0 md:flex md:h-dvh md:self-start md:overflow-y-auto md:w-60 md:shrink-0 md:flex-col md:gap-1 md:border-r md:bg-sidebar/70 md:p-3 md:backdrop-blur"
    >
      <Link
        href="/"
        className="mb-4 flex items-center gap-2.5 rounded-lg px-3 py-2 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Emblem className="size-8 shrink-0 drop-shadow-[0_0_6px_oklch(0.82_0.14_85/0.45)]" />
        <span className="font-display text-lg leading-tight font-bold tracking-wide text-gold-gradient">
          YGO Collection
        </span>
      </Link>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={cn(
            "relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground",
            isActive(pathname, href) &&
              "bg-linear-to-r from-gold/15 to-transparent font-medium text-gold before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-gold before:shadow-[0_0_8px] before:shadow-gold hover:text-gold",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** iPhone bottom tab bar (below md). Respects the home-indicator safe area. */
export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((i) => i.primary);
  const more = NAV_ITEMS.filter((i) => !i.primary);
  const moreActive = more.some((i) => isActive(pathname, i.href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/20 bg-background/75 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px] shadow-black/60 backdrop-blur-xl backdrop-saturate-150 md:hidden"
    >
      <ul className="grid grid-cols-5">
        {primary.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground",
                isActive(pathname, href) && "font-medium text-gold",
              )}
            >
              <Icon
                className={cn("size-5", isActive(pathname, href) && "drop-shadow-[0_0_6px_oklch(0.82_0.14_85/0.7)]")}
                aria-hidden
              />
              {label}
              {isActive(pathname, href) ? (
                <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-gold shadow-[0_0_6px] shadow-gold" />
              ) : null}
            </Link>
          </li>
        ))}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                "relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground",
                moreActive && "font-medium text-gold",
              )}
            >
              <Menu className="size-5" aria-hidden />
              More
              {moreActive ? (
                <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-gold shadow-[0_0_6px] shadow-gold" />
              ) : null}
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <SheetHeader>
                <SheetTitle className="text-gold">More</SheetTitle>
              </SheetHeader>
              <ul className="grid gap-1 px-4">
                {more.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive(pathname, href) ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-accent/50",
                        isActive(pathname, href) && "bg-gold/10 font-medium text-gold",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
