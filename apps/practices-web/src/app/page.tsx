import Link from "next/link";
import { ArrowRight, Boxes, FlaskConical, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listPracticeCases } from "@/lib/cases";

const CASES = listPracticeCases();

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden">
            <CardHeader className="gap-4 p-7 sm:p-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/66">
                <Layers3 className="h-3.5 w-3.5" />
                Validation Shell
              </div>
              <div className="max-w-3xl space-y-4">
                <CardTitle className="text-3xl leading-tight sm:text-5xl">
                  Context Practices needs one reusable web shell, not one-off demo pages.
                </CardTitle>
                <CardDescription className="max-w-2xl text-base text-white/72 sm:text-lg">
                  This app is the shared verification surface for recommendation, generation, search, and future
                  context-driven cases. Cases keep their own scripts and artifacts. The shell only reads and presents.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 px-7 pb-8 sm:px-8">
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
          <div className="grid gap-6">
            <Card>
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
            <Card>
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
              <Card key={item.slug} className="h-full">
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
                  <span className="text-xs text-white/50">{item.hasDemo ? "legacy demo present" : "shell route pending"}</span>
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

