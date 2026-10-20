import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { ClassicProgress, ClassicProgressSkeleton } from "@/features/progress/components/classic-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SetList } from "@/features/sets/components/set-list";
import { COMPLETION_LIMIT, listSetsWithCompletion } from "@/features/sets/queries";
import { setListParamsSchema } from "@/features/sets/schemas";
import { requireOwner } from "@/lib/auth";

export default async function SetsPage({ searchParams }: PageProps<"/sets">) {
  await requireOwner();
  const { q, classic } = setListParamsSchema.parse(await searchParams);
  const result = await listSetsWithCompletion({ q, classicOnly: classic });

  return (
    <>
      <PageHeader title="Official Sets" description="Browse official TCG sets and track unique-card completion." />
      <div className="mb-6">
        <Suspense fallback={<ClassicProgressSkeleton variant="bar" />}>
          <ClassicProgress variant="bar" />
        </Suspense>
      </div>

      <Form action="/sets" className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search sets by name or code
        </label>
        <Input
          id="q"
          name="q"
          type="search"
          placeholder="Set name or code (e.g. LOB)"
          defaultValue={q}
          className="h-11 min-w-0 flex-1 basis-48"
        />
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm">
          <input type="checkbox" name="classic" value="1" defaultChecked={classic} className="size-5" />
          Classic (DM era) only
        </label>
        <Button type="submit" className="h-11 px-4">
          Search
        </Button>
        {q || classic ? (
          <Button render={<Link href="/sets" />} nativeButton={false} variant="ghost" className="h-11 px-4">
            Clear
          </Button>
        ) : null}
      </Form>

      {!result.ok ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          The card catalog is unavailable right now. Please try again later.
        </p>
      ) : result.sets.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No sets match your search.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Showing {result.sets.length} of {result.totalMatches} sets.{" "}
            {result.completionComputed
              ? `Completion shown for the first ${Math.min(COMPLETION_LIMIT, result.sets.length)}; open a set for its full progress.`
              : "Search or filter to classic sets to see completion; open a set for its progress."}
          </p>
          <SetList entries={result.sets} />
        </>
      )}
    </>
  );
}
