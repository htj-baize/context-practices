import Link from "next/link";
import { ArrowRight, Boxes, Eye, FlaskConical, Layers3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listPracticeCases } from "@/lib/cases";

const CASES = listPracticeCases();
const FEATURED_CASE = CASES.find((item) => item.slug === "neta-next-collection-recommendation") ?? CASES[0];

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-7">
        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
            <CardHeader className="gap-5 p-6 sm:p-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/66">
                <Layers3 className="h-3.5 w-3.5" />
                Validation Shell
              </div>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                <div className="max-w-3xl space-y-4">
                  <CardTitle className="text-3xl leading-tight sm:text-5xl">
                    One shell for practice validation, with case UIs plugged in where they matter.
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-base text-white/72 sm:text-lg">
                    `context-practices` should feel like a product surface, not a filesystem viewer. Cases keep their own
                    scripts and artifacts. The web layer only reads outputs, organizes interaction, and makes validation faster.
                  </CardDescription>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[1.75rem] border border-white/10 bg-[#08131d]/72 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/46">Featured Route</div>
                    <div className="mt-2 text-lg font-semibold text-white">{FEATURED_CASE?.title ?? "No featured case"}</div>
                    <div className="mt-2 text-sm leading-6 text-white/66">
                      {FEATURED_CASE?.summary ?? "Add a case route to promote it here."}
                    </div>
                    {FEATURED_CASE ? (
                      <Button asChild className="mt-4 w-full">
                        <Link href={`/${FEATURED_CASE.slug}`}>
                          Open Demo
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Cases</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{CASES.length}</div>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Tagged</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{CASES.filter((item) => item.tags.length > 0).length}</div>
                    </div>
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/4 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Surface</div>
                      <div className="mt-2 text-2xl font-semibold text-white">Web</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 px-6 pb-6 sm:px-8 sm:pb-8">
              <Button asChild>
                <Link href="#cases">
                  Browse Cases
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="https://github.com/talesofai/neta-studio" target="_blank" rel="noreferrer">
                  Reference Stack
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card className="border-white/10 bg-[#08131d]/72">
              <CardHeader>
                <CardTitle className="text-base">Chosen Stack</CardTitle>
                <CardDescription>Next.js + React + Tailwind v4 + shadcn-style UI primitives.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {["Next 16", "React 19", "Tailwind 4", "shadcn/ui", "Zustand", "React Query"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-medium text-white/82"
                  >
                    {item}
                  </span>
                ))}
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-[#08131d]/72">
              <CardHeader>
                <CardTitle className="text-base">Rules</CardTitle>
                <CardDescription>
                  Case logic stays in its own directory. This shell consumes outputs and adds shared interaction patterns.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-white/72">
                <div className="flex items-start gap-3">
                  <Boxes className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <p>Do not push presentation concerns back into case scripts or core libraries.</p>
                </div>
                <div className="flex items-start gap-3">
                  <FlaskConical className="mt-0.5 h-4 w-4 text-sky-300" />
                  <p>Each future case can add a dedicated route, but shared shell primitives live here once.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-white/10 bg-[#08131d]/72">
            <CardHeader className="pb-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/54">
                <Sparkles className="h-3.5 w-3.5" />
                Shell Goals
              </div>
              <CardTitle className="text-2xl">What this web layer should do</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm leading-6 text-white/70">
              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
                Read generated outputs and present them without pushing UI concerns back into scripts.
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
                Provide reusable interaction patterns: tabs, sheets, focus cards, signal summaries, and mobile views.
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
                Let each case graduate from static artifacts into a product-shaped verification experience.
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-[#08131d]/72">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">Current focus</CardTitle>
              <CardDescription>
                The first polished route is the Neta next-collection recommendation demo. Other cases remain shell entries until they get dedicated presenters.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-emerald-400/16 bg-emerald-400/8 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                  <Eye className="h-4 w-4" />
                  Product-style validation
                </div>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Start from a real recommendation flow, then optimize for mobile scanning, preference feedback, and explanation review.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-sky-400/16 bg-sky-400/8 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-sky-100">
                  <Boxes className="h-4 w-4" />
                  Case isolation
                </div>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Presenter logic stays local to each route. Shared cards, buttons, and layout rules stay in the shell.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="cases" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/48">Cases</p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Current practice catalog</h2>
            </div>
            <p className="text-sm text-white/58">{CASES.length} cases discovered from filesystem</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CASES.map((item) => (
              <Card key={item.slug} className="h-full border-white/10 bg-[#08131d]/72">
                <CardHeader>
                  <div className="flex flex-wrap gap-2">
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
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.summary}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-4">
                  <span className="text-xs text-white/50">
                    {item.slug === FEATURED_CASE?.slug ? "featured route" : item.hasDemo ? "legacy demo present" : "shell route pending"}
                  </span>
                  <Button asChild variant="outline" size="sm">
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
