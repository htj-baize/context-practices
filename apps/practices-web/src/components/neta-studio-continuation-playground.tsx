"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BrainCircuit, CheckCircle2, Coins, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ContinuationFixtureViewModel,
  ContinuationPlaygroundData,
} from "@/lib/server/neta-studio-continuation-playground";

type PlaygroundProps = {
  data: ContinuationPlaygroundData;
};

type PanelKey = "context" | "candidates" | "offers" | "request";

const PANEL_ORDER: PanelKey[] = ["context", "candidates", "offers", "request"];

const panelMeta: Record<PanelKey, { label: string; description: string }> = {
  context: {
    label: "Context",
    description: "世界状态、会话焦点与 readiness。",
  },
  candidates: {
    label: "Candidates",
    description: "从当前世界长出来的 continuation seams。",
  },
  offers: {
    label: "Offers",
    description: "被翻译成前台动作的 top 1-3 continuation offers。",
  },
  request: {
    label: "Execution",
    description: "选中 top offer 后发给 continuation runtime 的结构化请求。",
  },
};

function ToneChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/68">
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-white/58">{hint}</div>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-[1.35rem] border border-white/8 bg-[#050c13] p-4 text-xs leading-6 text-white/72">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function SourceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span
              key={`${title}-${item}`}
              className="rounded-full border border-sky-400/18 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-100"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-white/46">none</span>
        )}
      </div>
    </div>
  );
}

function ContextPanel({ fixture }: { fixture: ContinuationFixtureViewModel }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-white/10 bg-[#08131d]/72">
        <CardHeader>
          <CardTitle className="text-white">World state</CardTitle>
          <CardDescription className="text-white/62">
            从 snapshot 装出来的 continuation context。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="World" value={fixture.context.worldName ?? "Untitled"} hint={fixture.snapshot.worldId} />
            <MetricCard
              label="Readiness"
              value={fixture.context.readiness.ready ? "ready" : "blocked"}
              hint={fixture.context.readiness.reason}
            />
            <MetricCard label="Atoms" value={fixture.context.atoms.length} hint="objects available for continuation grounding" />
            <MetricCard label="Works" value={fixture.context.works.length} hint="written artifacts already inside the world" />
          </div>
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">World config</div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-white/72">
              <p>
                <span className="text-white/48">Genre</span> {fixture.context.config?.genre ?? "unknown"}
              </p>
              <p>
                <span className="text-white/48">Tone</span> {fixture.context.config?.tone ?? "unknown"}
              </p>
              <p>
                <span className="text-white/48">Core conflict</span> {fixture.context.config?.coreConflict ?? "n/a"}
              </p>
              <SourceList title="Rules" items={fixture.context.config?.rules ?? []} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#08131d]/72">
        <CardHeader>
          <CardTitle className="text-white">Session focus</CardTitle>
          <CardDescription className="text-white/62">
            当前 continuation 是围绕哪些对象、哪些用户意图长出来的。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[1.4rem] border border-emerald-400/16 bg-emerald-400/8 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">Recent user intent</div>
            <div className="mt-3 space-y-2 text-sm leading-6 text-white/84">
              {fixture.context.session.recentUserMessages.map((message, index) => (
                <p key={`user-${index}`}>{message}</p>
              ))}
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Recent assistant context</div>
            <div className="mt-3 space-y-2 text-sm leading-6 text-white/70">
              {fixture.context.session.recentAssistantMessages.map((message, index) => (
                <p key={`assistant-${index}`}>{message}</p>
              ))}
            </div>
          </div>
          <SourceList title="Viewed atoms" items={fixture.context.session.recentViewedAtomIds} />
          <SourceList title="Viewed works" items={fixture.context.session.recentViewedWorkIds} />
          <SourceList title="Created atoms" items={fixture.context.session.recentCreatedAtomIds} />
          <SourceList title="Created works" items={fixture.context.session.recentCreatedWorkIds} />
        </CardContent>
      </Card>
    </div>
  );
}

function CandidatesPanel({ fixture }: { fixture: ContinuationFixtureViewModel }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="grid gap-4">
        {fixture.candidates.map((candidate) => (
          <Card key={candidate.id} className="border-white/10 bg-[#08131d]/72">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <ToneChip>{candidate.dynamicType}</ToneChip>
                <ToneChip>{candidate.id}</ToneChip>
              </div>
              <CardTitle className="text-white">{candidate.brief}</CardTitle>
              <CardDescription className="text-white/64">{candidate.worldReason}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm leading-6 text-white/72 md:grid-cols-2">
              <SourceList title="Source atoms" items={candidate.sourceAtomIds} />
              <SourceList title="Source works" items={candidate.sourceWorkIds} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-white/10 bg-[#08131d]/72">
        <CardHeader>
          <CardTitle className="text-white">Candidate heuristics</CardTitle>
          <CardDescription className="text-white/62">
            这一层只回答“这一步是否真的是从当前世界长出来的下一步”。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-white/72">
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
            过滤条件先以 runtime validity 为主，不做 UI/付费层面的包装。
          </div>
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
            当前 fixture 里主要覆盖 `promise / gap / escalation / resolution` 四类动力。
          </div>
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
            下一步接真实世界数据时，优先替换 assemble/adapt 层，不改候选展示协议。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OffersPanel({ fixture }: { fixture: ContinuationFixtureViewModel }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-3">
        {fixture.offers.map((offer, index) => (
          <Card
            key={offer.id}
            className={index === 0 ? "border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(8,19,29,0.82))]" : "border-white/10 bg-[#08131d]/72"}
          >
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                {index === 0 ? <ToneChip>Top offer</ToneChip> : null}
                <ToneChip>{offer.actionType}</ToneChip>
                <ToneChip>{offer.intensity}</ToneChip>
              </div>
              <CardTitle className="text-white">{offer.headline}</CardTitle>
              <CardDescription className="text-white/64">{offer.whyNow}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Score" value={offer.score} hint="priority after attachment, urgency, pull, fit, and penalties" />
                <MetricCard label="Price" value={`${offer.creditPrice} cr`} hint={`${offer.estimatedTokenCost} estimated tokens`} />
              </div>
              <SourceList title="Source atoms" items={offer.sourceAtomIds} />
              <SourceList title="Source works" items={offer.sourceWorkIds} />
              <div className="rounded-[1.35rem] border border-white/8 bg-[#050c13] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Score breakdown</div>
                <div className="mt-3 grid gap-2 text-sm text-white/72">
                  <div className="flex items-center justify-between"><span>attachment</span><span>{offer.scoreBreakdown.attachment}</span></div>
                  <div className="flex items-center justify-between"><span>urgency</span><span>{offer.scoreBreakdown.urgency}</span></div>
                  <div className="flex items-center justify-between"><span>pull</span><span>{offer.scoreBreakdown.pull}</span></div>
                  <div className="flex items-center justify-between"><span>world fit</span><span>{offer.scoreBreakdown.worldFit}</span></div>
                  <div className="flex items-center justify-between"><span>cost penalty</span><span>-{offer.scoreBreakdown.costPenalty}</span></div>
                  <div className="flex items-center justify-between"><span>repetition penalty</span><span>-{offer.scoreBreakdown.repetitionPenalty}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RequestPanel({ fixture }: { fixture: ContinuationFixtureViewModel }) {
  if (!fixture.request) {
    return (
      <Card className="border-white/10 bg-[#08131d]/72">
        <CardHeader>
          <CardTitle className="text-white">Execution request</CardTitle>
          <CardDescription className="text-white/62">No top offer was available for this fixture.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-white/10 bg-[#08131d]/72">
        <CardHeader>
          <CardTitle className="text-white">Execution summary</CardTitle>
          <CardDescription className="text-white/62">
            Top offer 被转成 continuation runtime 可以直接消费的结构化请求。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Action" value={fixture.request.actionType} hint="continuation operation type" />
            <MetricCard label="Output" value={fixture.request.expectedOutput} hint="artifact expected from the run" />
          </div>
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Prompt brief</div>
            <p className="mt-3 text-sm leading-6 text-white/84">{fixture.request.promptBrief}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">World reason</div>
            <p className="mt-3 text-sm leading-6 text-white/72">{fixture.request.worldReason}</p>
          </div>
          <SourceList title="Writeback target" items={[`${fixture.request.writebackPlan.target}:${fixture.request.writebackPlan.mode}`]} />
          <SourceList title="Execution notes" items={fixture.request.executionNotes} />
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-[#08131d]/72">
        <CardHeader>
          <CardTitle className="text-white">Request payload</CardTitle>
          <CardDescription className="text-white/62">这一层已经可以直接拿去接 agent continuation runtime。</CardDescription>
        </CardHeader>
        <CardContent>
          <JsonBlock value={fixture.request} />
        </CardContent>
      </Card>
    </div>
  );
}

export function NetaStudioContinuationPlayground({ data }: PlaygroundProps) {
  const [activeFixtureId, setActiveFixtureId] = useState(data.fixtures[0]?.id ?? "");
  const [activePanel, setActivePanel] = useState<PanelKey>("offers");

  const activeFixture = useMemo(
    () => data.fixtures.find((fixture) => fixture.id === activeFixtureId) ?? data.fixtures[0],
    [activeFixtureId, data.fixtures],
  );

  const comparison = useMemo(
    () =>
      data.fixtures.map((fixture) => ({
        id: fixture.id,
        label: fixture.label,
        headline: fixture.offers[0]?.headline ?? "No offer",
        actionType: fixture.offers[0]?.actionType ?? "n/a",
        price: fixture.offers[0]?.creditPrice ?? 0,
      })),
    [data.fixtures],
  );

  if (!activeFixture) {
    return null;
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="secondary" className="w-fit">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <ToneChip>{data.caseSlug}</ToneChip>
            <ToneChip>context-engine</ToneChip>
            <ToneChip>playground</ToneChip>
          </div>
        </div>

        <Card className="overflow-hidden border-white/12 bg-[linear-gradient(180deg,rgba(8,19,29,0.96),rgba(8,19,29,0.82))] shadow-[0_24px_80px_rgba(8,19,29,0.32)]">
          <CardHeader className="gap-5 p-6 sm:p-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/58">
              <Sparkles className="h-3.5 w-3.5" />
              Continuation Playground
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
              <div className="space-y-4">
                <CardTitle className="text-3xl text-white sm:text-5xl">{data.title}</CardTitle>
                <CardDescription className="max-w-3xl text-base text-white/70 sm:text-lg">
                  {data.summary}
                </CardDescription>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-[#08131d]/72 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Current fixture</div>
                <div className="mt-2 text-lg font-semibold text-white">{activeFixture.label}</div>
                <div className="mt-2 text-sm leading-6 text-white/64">{activeFixture.description}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.fixtures.map((fixture) => (
                    <button
                      key={fixture.id}
                      type="button"
                      onClick={() => setActiveFixtureId(fixture.id)}
                      className={
                        fixture.id === activeFixture.id
                          ? "rounded-full border border-emerald-300/30 bg-emerald-400/14 px-3 py-1.5 text-xs font-medium text-emerald-100"
                          : "rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-medium text-white/62"
                      }
                    >
                      {fixture.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 border-t border-white/8 px-6 pt-5 pb-6 sm:px-8 sm:pb-8 md:grid-cols-4">
            <MetricCard label="Candidates" value={activeFixture.candidates.length} hint="valid continuation seams" />
            <MetricCard label="Offers" value={activeFixture.offers.length} hint="front-stage actions after ranking" />
            <MetricCard label="Top price" value={`${activeFixture.offers[0]?.creditPrice ?? 0} cr`} hint="price for highest priority offer" />
            <MetricCard label="World depth" value={`${activeFixture.snapshot.atoms.length}/${activeFixture.snapshot.works.length}`} hint="atoms / works in current fixture" />
          </CardContent>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
          <Card className="h-fit border-white/10 bg-[#08131d]/72 xl:sticky xl:top-6">
            <CardHeader>
              <CardTitle className="text-white">Panels</CardTitle>
              <CardDescription className="text-white/62">
                用统一入口切换四层：context, candidates, offers, execution。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {PANEL_ORDER.map((panelKey) => {
                const meta = panelMeta[panelKey];
                const isActive = panelKey === activePanel;
                return (
                  <button
                    key={panelKey}
                    type="button"
                    onClick={() => setActivePanel(panelKey)}
                    className={
                      isActive
                        ? "rounded-[1.2rem] border border-emerald-300/22 bg-emerald-400/12 p-3 text-left"
                        : "rounded-[1.2rem] border border-white/8 bg-white/[0.035] p-3 text-left"
                    }
                  >
                    <div className="text-sm font-medium text-white">{meta.label}</div>
                    <div className="mt-1 text-xs leading-5 text-white/56">{meta.description}</div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {activePanel === "context" ? <ContextPanel fixture={activeFixture} /> : null}
            {activePanel === "candidates" ? <CandidatesPanel fixture={activeFixture} /> : null}
            {activePanel === "offers" ? <OffersPanel fixture={activeFixture} /> : null}
            {activePanel === "request" ? <RequestPanel fixture={activeFixture} /> : null}

            <Card className="border-white/10 bg-[#08131d]/72">
              <CardHeader>
                <CardTitle className="text-white">Fixture comparison</CardTitle>
                <CardDescription className="text-white/62">
                  同一条世界线往前推进后，top offer 是否发生结构性变化。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {comparison.map((item, index) => (
                  <div key={item.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        {item.label}
                      </div>
                      {index === 0 ? <ArrowRight className="h-4 w-4 text-white/30" /> : null}
                    </div>
                    <div className="mt-3 text-lg font-semibold text-white">{item.headline}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ToneChip>{item.actionType}</ToneChip>
                      <ToneChip>{item.price} cr</ToneChip>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#08131d]/72">
              <CardHeader>
                <CardTitle className="text-white">Why this matters</CardTitle>
                <CardDescription className="text-white/62">
                  这页不是展示脚本产物，而是在验证 `context-engine` 是否能成为上游 continuation runtime。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.4rem] border border-sky-400/16 bg-sky-400/8 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-sky-100">
                    <BrainCircuit className="h-4 w-4" />
                    Validity first
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    先回答“这一步为什么成立”，再回答“这一步怎么卖给用户”。
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-emerald-400/16 bg-emerald-400/8 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-100">
                    <Coins className="h-4 w-4" />
                    Pricing attached
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    价格不是单独算的，而是跟 continuation action 与成本估计一起生成。
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Play className="h-4 w-4" />
                    Runtime-ready
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    选中 top offer 后，已经能落成一个可执行、可写回、可再次 rerun 的请求对象。
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#08131d]/72">
              <CardHeader>
                <CardTitle className="text-white">Raw snapshot</CardTitle>
                <CardDescription className="text-white/62">
                  方便直接检查当前 fixture 输入，不需要回到 case 目录看 JSON。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JsonBlock value={activeFixture.snapshot} />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
