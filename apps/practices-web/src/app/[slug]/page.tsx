import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileJson, FolderOpen, MonitorSmartphone } from "lucide-react";
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
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Button asChild variant="secondary" className="w-fit">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-sky-200"
                >
                  {tag}
                </span>
              ))}
            </div>
            <CardTitle className="text-3xl">{item.title}</CardTitle>
            <CardDescription className="text-base">{item.summary}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Card className="bg-white/4">
              <CardHeader>
                <CardTitle className="text-base">Current status</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-white/70">
                This route is ready as the dedicated shell entry for this case, but its custom interactive UI is not
                wired yet.
              </CardContent>
            </Card>
            <Card className="bg-white/4">
              <CardHeader>
                <CardTitle className="text-base">Expected inputs</CardTitle>
              </CardHeader>
              <CardContent className="flex items-start gap-3 text-sm leading-6 text-white/70">
                <FileJson className="mt-0.5 h-4 w-4 text-emerald-300" />
                Read case outputs and derived JSON artifacts without altering generation scripts.
              </CardContent>
            </Card>
            <Card className="bg-white/4">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Next integration step</CardTitle>
            <CardDescription>
              Add a case-specific presenter under this route and keep the data adapter local to the web layer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-white/72">
            <p className="flex items-start gap-3">
              <FolderOpen className="mt-0.5 h-4 w-4 text-amber-300" />
              Source case directory: <span className="font-mono text-white/84">cases/{item.slug}</span>
            </p>
            <p>Recommended next move: migrate the current legacy demo for this case into this route and delete duplicated static UI later.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

