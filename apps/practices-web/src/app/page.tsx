import Link from "next/link";
import { ArrowRight, Eye, Layers3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listPracticeCases } from "@/lib/cases";

const CASES = listPracticeCases();
const UNIFIED_ROUTE = {
  href: "/neta-studio-continuation-engine",
  title: "Neta Studio Continuation Engine",
  summary: "Fixture-backed playground that validates context assembly, continuation candidates, ranked offers, and execution requests.",
};

export default function HomePage() {
  const dedicatedCount = CASES.filter((item) => item.hasDedicatedPresenter).length;

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-7">
        <section className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
          <Card className="overflow-hidden border-white/12 bg-[linear-gradient(180deg,rgba(8,19,29,0.96),rgba(8,19,29,0.82))] shadow-[0_24px_80px_rgba(8,19,29,0.32)]">
            <CardHeader className="gap-5 p-6 sm:p-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/66">
                <Layers3 className="h-3.5 w-3.5" />
                Validation Shell
              </div>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                <div className="max-w-3xl space-y-4">
                  <CardTitle className="text-3xl leading-tight text-white sm:text-5xl">
                    Context validation cases, with one current playground worth opening first.
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-base text-white/72 sm:text-lg">
                    The shell should help inspect real practice outputs quickly. Open the current continuation playground first, then use the catalog below to compare other cases.
                  </CardDescription>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[1.75rem] border border-emerald-400/16 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(8,19,29,0.82))] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/46">Open first</div>
                    <div className="mt-2 text-lg font-semibold text-white">{UNIFIED_ROUTE.title}</div>
                    <div className="mt-2 text-sm leading-6 text-white/66">{UNIFIED_ROUTE.summary}</div>
                    <Button asChild className="mt-4 w-full">
                      <Link href={UNIFIED_ROUTE.href}>
                        Open Playground
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Cases</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{CASES.length}</div>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Live</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{dedicatedCount}</div>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Tagged</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{CASES.filter((item) => item.tags.length > 0).length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 border-t border-white/8 px-6 pt-5 pb-6 sm:px-8 sm:pt-5 sm:pb-8">
              <Button asChild>
                <Link href="#cases">
                  Browse Cases
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card className="border-white/10 bg-[#08131d]/72">
              <CardHeader>
                <CardTitle className="text-base text-white">Current focus</CardTitle>
                <CardDescription className="text-white/62">
                  The current top-level entry is the continuation engine playground.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-white/72">
                <div className="rounded-[1.4rem] border border-emerald-400/16 bg-emerald-400/8 p-4">
                  Start from real world context, then inspect continuation validity, offer ranking, pricing, and execution request composition.
                </div>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link href={UNIFIED_ROUTE.href}>
                    Go to current playground
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-[#08131d]/72">
              <CardHeader>
                <CardTitle className="text-base text-white">Shell rules</CardTitle>
                <CardDescription className="text-white/62">Only keep information that helps decide where to look next.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-white/72">
                <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
                  Case logic stays in the case directory. The web shell should only adapt and present outputs.
                </div>
                <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
                  Dedicated routes are the important signal. Shared shell entries are lower priority until they get a focused presenter.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="cases" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/48">Cases</p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Current practice catalog</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/62">
                {CASES.length} total
              </span>
              <span className="rounded-full border border-emerald-400/18 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
                {dedicatedCount} dedicated
              </span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CASES.map((item) => (
              <Card
                key={item.slug}
                className={
                  item.hasDedicatedPresenter
                    ? "h-full border-emerald-400/16 bg-[linear-gradient(180deg,rgba(16,185,129,0.05),rgba(8,19,29,0.82))]"
                    : "h-full border-white/10 bg-[#08131d]/72"
                }
              >
                <CardHeader>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={
                        item.hasDedicatedPresenter
                          ? "rounded-full border border-emerald-400/18 bg-emerald-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-100"
                          : "rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-white/54"
                      }
                    >
                      {item.hasDedicatedPresenter ? "live" : "shell"}
                    </span>
                    {item.tags.length ? (
                      item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-white/54">
                        case
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-white">{item.title}</CardTitle>
                  <CardDescription className="text-white/62">{item.summary}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <div className="flex items-center justify-between gap-4 text-xs text-white/50">
                    <span>{item.hasDedicatedPresenter ? "dedicated route live" : "shared shell entry"}</span>
                    <span className="truncate font-mono text-[11px] text-white/36">{item.slug}</span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/6 text-white hover:bg-white/10">
                    <Link href={`/${item.slug}`}>Open Route</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
