import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileJson, FolderOpen, Layers3, MonitorSmartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listPracticeCases } from "@/lib/cases";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return listPracticeCases().map((item) => ({ slug: item.slug }));
}

export default async function CasePage({ params }: PageProps) {
  const { slug } = await params;
  const item = listPracticeCases().find((entry) => entry.slug === slug);
  if (!item) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <Button asChild variant="secondary" className="w-fit">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
          <CardHeader className="gap-5 p-6 sm:p-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/58">
              <Layers3 className="h-3.5 w-3.5" />
              Case Route
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-sky-200"
                    >
                      {tag}
                    </span>
                  ))}
                  {!item.tags.length ? (
                    <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-white/54">
                      case
                    </span>
                  ) : null}
                </div>
                <CardTitle className="text-3xl sm:text-4xl">{item.title}</CardTitle>
                <CardDescription className="max-w-3xl text-base">{item.summary}</CardDescription>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-[#08131d]/72 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/44">Route Status</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {item.hasDedicatedPresenter ? "Dedicated presenter live" : "Shared shell entry"}
                </div>
                <div className="mt-2 text-sm leading-6 text-white/64">
                  {item.hasDedicatedPresenter
                    ? "This case already has a focused interactive validation page."
                    : "This route is ready for a case-specific presenter once the data adapter is defined."}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-3">
            <Card className="border-white/8 bg-white/4">
              <CardHeader>
                <CardTitle className="text-base">Current status</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-white/70">
                {item.hasDedicatedPresenter
                  ? "This route already acts as the reference interactive presenter for the shell."
                  : "This route is ready as the dedicated shell entry for this case, but its custom interactive UI is not wired yet."}
              </CardContent>
            </Card>
            <Card className="border-white/8 bg-white/4">
              <CardHeader>
                <CardTitle className="text-base">Expected inputs</CardTitle>
              </CardHeader>
              <CardContent className="flex items-start gap-3 text-sm leading-6 text-white/70">
                <FileJson className="mt-0.5 h-4 w-4 text-emerald-300" />
                Read case outputs and derived JSON artifacts without altering generation scripts.
              </CardContent>
            </Card>
            <Card className="border-white/8 bg-white/4">
              <CardHeader>
                <CardTitle className="text-base">Target UI</CardTitle>
              </CardHeader>
              <CardContent className="flex items-start gap-3 text-sm leading-6 text-white/70">
                <MonitorSmartphone className="mt-0.5 h-4 w-4 text-sky-300" />
                Mobile-first validation surface using shared tabs, sheets, cards, and signal-driven interaction.
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#08131d]/72">
          <CardHeader>
            <CardTitle className="text-xl">Next integration step</CardTitle>
            <CardDescription>
              Add a case-specific presenter under this route and keep the data adapter local to the web layer.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6 text-white/72 lg:grid-cols-2">
            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
              <p className="flex items-start gap-3">
                <FolderOpen className="mt-0.5 h-4 w-4 text-amber-300" />
                Source case directory: <span className="font-mono text-white/84">cases/{item.slug}</span>
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
              <p className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-emerald-300" />
                Recommended move: define a local adapter in the web layer, then promote this route from shell entry to focused presenter.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
