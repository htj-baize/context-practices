"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  Heart,
  Layers3,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type NetaCollectionProfile,
  type NetaNormalizedFeedArtifact,
  type NetaRecommendationArtifact,
} from "@/lib/neta-next-collection";

type DemoProps = {
  current: NetaCollectionProfile;
  normalized: NetaNormalizedFeedArtifact;
  recommendation: NetaRecommendationArtifact;
};

type QueueEntry = {
  candidate: NetaCollectionProfile;
  score: number;
  reason: string;
  evidence: {
    conceptOverlap: string[];
    intentOverlap: string[];
    themeOverlap: string[];
    tagOverlap: string[];
    formatOverlap: string[];
    interactionOverlap: string[];
    communityOverlap: string[];
  };
};

type ActiveTab = "current" | "next" | "queue";

type SheetState = {
  title: string;
  summary: string;
  chips: string[];
  items: string[];
} | null;

const weightConfig = {
  concept: 9,
  intent: 6,
  theme: 4,
  tag: 3,
  format: 2,
  interaction: 2,
  community: 1,
  preference: 2,
  recommendationBoost: 4,
};

function unique(values: string[] = []): string[] {
  return [...new Set(values.filter(Boolean))];
}

function formatListLike(value: string[] | Record<string, number> | undefined, empty = "none"): string {
  if (!value) {
    return empty;
  }
  if (Array.isArray(value)) {
    return value.join(" / ") || empty;
  }
  const entries = Object.entries(value);
  return entries.length ? entries.map(([key, count]) => `${key}×${count}`).join(" / ") : empty;
}

function overlap(left: string[] = [], right: string[] = []): string[] {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function coverFallback(title: string): string {
  return `linear-gradient(135deg, rgba(68,216,166,0.36), rgba(125,196,255,0.34)), linear-gradient(180deg, rgba(7,17,26,0.24), rgba(7,17,26,0.62))`;
}

function buildPreferenceBuckets(items: NetaCollectionProfile[]) {
  const buckets = {
    concept: new Map<string, number>(),
    intent: new Map<string, number>(),
    theme: new Map<string, number>(),
    tag: new Map<string, number>(),
    community: new Map<string, number>(),
  };

  for (const item of items) {
    for (const concept of item.concept_labels ?? []) {
      buckets.concept.set(concept, (buckets.concept.get(concept) ?? 0) + 1);
    }
    for (const intent of item.intent_labels ?? []) {
      buckets.intent.set(intent, (buckets.intent.get(intent) ?? 0) + 1);
    }
    for (const theme of item.theme_labels ?? []) {
      buckets.theme.set(theme, (buckets.theme.get(theme) ?? 0) + 1);
    }
    for (const tag of item.content_tags ?? []) {
      buckets.tag.set(tag, (buckets.tag.get(tag) ?? 0) + 1);
    }
    for (const tag of item.community_tags ?? []) {
      buckets.community.set(tag, (buckets.community.get(tag) ?? 0) + 1);
    }
  }

  return buckets;
}

function scoreCandidate(
  current: NetaCollectionProfile,
  candidate: NetaCollectionProfile,
  preferences: ReturnType<typeof buildPreferenceBuckets>,
  recommendationSeedId: string
): QueueEntry {
  const conceptOverlap = overlap(current.concept_labels, candidate.concept_labels);
  const intentOverlap = overlap(current.intent_labels, candidate.intent_labels);
  const themeOverlap = overlap(current.theme_labels, candidate.theme_labels);
  const tagOverlap = overlap(current.content_tags, candidate.content_tags);
  const formatOverlap = overlap(current.format_labels, candidate.format_labels);
  const interactionOverlap = overlap(current.interaction_flags, candidate.interaction_flags);
  const communityOverlap = overlap(current.community_tags, candidate.community_tags);

  let score = 0;
  score += conceptOverlap.length * weightConfig.concept;
  score += intentOverlap.length * weightConfig.intent;
  score += themeOverlap.length * weightConfig.theme;
  score += Math.min(tagOverlap.length, 4) * weightConfig.tag;
  score += formatOverlap.length * weightConfig.format;
  score += interactionOverlap.length * weightConfig.interaction;
  score += communityOverlap.length * weightConfig.community;

  for (const concept of candidate.concept_labels ?? []) {
    score += (preferences.concept.get(concept) ?? 0) * weightConfig.preference;
  }
  for (const intent of candidate.intent_labels ?? []) {
    score += (preferences.intent.get(intent) ?? 0) * (weightConfig.preference + 1);
  }
  for (const theme of candidate.theme_labels ?? []) {
    score += (preferences.theme.get(theme) ?? 0) * weightConfig.preference;
  }
  for (const tag of candidate.content_tags ?? []) {
    score += preferences.tag.get(tag) ?? 0;
  }
  for (const tag of candidate.community_tags ?? []) {
    score += preferences.community.get(tag) ?? 0;
  }
  if (candidate.uuid === recommendationSeedId) {
    score += weightConfig.recommendationBoost;
  }

  const reason =
    conceptOverlap.length > 0
      ? `概念连续：${conceptOverlap.slice(0, 3).join(" / ")}`
      : intentOverlap.length > 0
        ? `玩法意图：${intentOverlap.slice(0, 3).join(" / ")}`
        : themeOverlap.length > 0
          ? `主题连续：${themeOverlap.slice(0, 3).join(" / ")}`
          : tagOverlap.length > 0
            ? `标签连续：${tagOverlap.slice(0, 3).join(" / ")}`
            : interactionOverlap.length > 0
              ? `互动连续：${interactionOverlap.slice(0, 3).join(" / ")}`
              : "作为候选保留，等待更多用户信号。";

  return {
    candidate,
    score,
    reason,
    evidence: {
      conceptOverlap,
      intentOverlap,
      themeOverlap,
      tagOverlap,
      formatOverlap,
      interactionOverlap,
      communityOverlap,
    },
  };
}

function topSignals(items: NetaCollectionProfile[]) {
  const buckets = buildPreferenceBuckets(items);
  return Object.entries(buckets).flatMap(([bucket, map]) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key, value]) => ({ bucket, key, value }))
  );
}

function SignalChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/72">{label}</span>
  );
}

function StatTile({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className={`min-w-0 rounded-2xl border px-3 py-3 ${accent ? "border-emerald-400/20 bg-emerald-400/10" : "border-white/8 bg-white/4"}`}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/44">{label}</div>
      <div className="mt-2 line-clamp-2 break-words text-base font-semibold text-white">{value}</div>
    </div>
  );
}

function CollectionCover({ item }: { item: NetaCollectionProfile }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-white/6">
      {item.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={item.title} className="h-full w-full object-cover" src={item.cover_url} />
      ) : (
        <div
          className="flex h-full w-full items-end p-5 text-xl font-semibold text-white/88"
          style={{ background: coverFallback(item.title) }}
        >
          {item.title}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07111a]/65 via-transparent to-transparent" />
    </div>
  );
}

function CollectionCard({
  entry,
  label,
  onLike,
  onSkip,
  onDetail,
  compact = false,
}: {
  entry: QueueEntry;
  label: string;
  onLike: () => void;
  onSkip: () => void;
  onDetail: () => void;
  compact?: boolean;
}) {
  const item = entry.candidate;
  return (
    <Card className="overflow-hidden border-white/8 bg-[#08131d]/72">
      <CardContent className={`grid gap-4 p-4 sm:p-5 ${compact ? "lg:grid-cols-[168px_minmax(0,1fr)] lg:items-start" : ""}`}>
        <div className={compact ? "lg:max-w-[168px]" : ""}>
          <CollectionCover item={item} />
        </div>
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <SignalChip label={label} />
            <SignalChip label={`${entry.score} pts`} />
            <SignalChip label={(item.source_feed_item?.recall_sources ?? []).slice(0, 2).join(" / ") || "recall"} />
          </div>
          <div className="space-y-2">
            <h3 className={`${compact ? "text-lg" : "text-xl"} font-semibold leading-tight text-white`}>{item.title}</h3>
            <p className={`text-white/68 ${compact ? "line-clamp-2 text-sm leading-5" : "text-sm leading-6"}`}>{entry.reason}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unique([...(item.concept_labels ?? []), ...(item.intent_labels ?? []), ...(item.theme_labels ?? [])])
              .slice(0, compact ? 4 : 6)
              .map((chip) => (
                <SignalChip key={chip} label={chip} />
              ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-white/60">
            {(item.interaction_flags ?? []).length > 0 ? <SignalChip label={`互动 ${(item.interaction_flags ?? []).join(" / ")}`} /> : null}
            {(item.content_tags ?? []).length > 0 ? <SignalChip label={`标签 ${(item.content_tags ?? []).slice(0, 2).join(" / ")}`} /> : null}
            {(item.community_tags ?? []).length > 0 ? <SignalChip label={`社区 ${(item.community_tags ?? []).slice(0, 2).join(" / ")}`} /> : null}
          </div>
          <div className={`grid gap-2 ${compact ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2 sm:flex sm:flex-wrap"}`}>
            <Button asChild variant="outline" className="border-white/12 bg-transparent text-white hover:bg-white/6">
              <Link href={item.collection_link ?? "#"} rel="noreferrer" target="_blank">
                <ExternalLink className="h-4 w-4" />
                打开
              </Link>
            </Button>
            <Button onClick={onDetail} variant="secondary">
              <Sparkles className="h-4 w-4" />
              理由
            </Button>
            <Button onClick={onSkip} variant="secondary">
              <X className="h-4 w-4" />
              跳过
            </Button>
            <Button onClick={onLike}>
              <Heart className="h-4 w-4" />
              点赞
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RankedQueueRow({
  entry,
  index,
  onLike,
  onSkip,
  onDetail,
}: {
  entry: QueueEntry;
  index: number;
  onLike: () => void;
  onSkip: () => void;
  onDetail: () => void;
}) {
  const item = entry.candidate;
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.035] px-4 py-3 transition hover:bg-white/[0.055]">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">Rank</div>
        <div className="mt-1 text-2xl font-semibold text-white">{index + 1}</div>
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/6">
            {item.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={item.title} className="h-full w-full object-cover" src={item.cover_url} />
            ) : (
              <div className="h-full w-full" style={{ background: coverFallback(item.title) }} />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-white">{item.title}</div>
            <div className="truncate text-sm text-white/58">{entry.reason}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SignalChip label={`${entry.score} pts`} />
          <SignalChip label={(item.source_feed_item?.recall_sources ?? []).slice(0, 2).join(" / ") || "recall"} />
          {unique([...(item.concept_labels ?? []), ...(item.intent_labels ?? []), ...(item.theme_labels ?? [])])
            .slice(0, 2)
            .map((chip) => (
              <SignalChip key={chip} label={chip} />
            ))}
        </div>
      </div>
      <div className="flex items-center gap-2 self-stretch">
        <Button onClick={onDetail} size="sm" variant="secondary">
          理由
        </Button>
        <Button onClick={onSkip} size="sm" variant="secondary">
          跳过
        </Button>
        <Button onClick={onLike} size="sm">
          点赞
        </Button>
      </div>
    </div>
  );
}

export function NetaRecommendationDemo({ current, normalized, recommendation }: DemoProps) {
  const items = useMemo(() => {
    const byId = new Map<string, NetaCollectionProfile>();
    byId.set(current.uuid, current);
    for (const item of normalized.candidate_collections ?? []) {
      byId.set(item.uuid, item);
    }
    return byId;
  }, [current, normalized]);

  const [currentId, setCurrentId] = useState(current.uuid);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [mobileDeckIndex, setMobileDeckIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>("next");
  const [sheet, setSheet] = useState<SheetState>(null);

  const currentItem = items.get(currentId) ?? current;
  const likedItems = likedIds.map((id) => items.get(id)).filter((item): item is NetaCollectionProfile => Boolean(item));

  const queue = useMemo(() => {
    const preferences = buildPreferenceBuckets(likedItems);
    return [...items.values()]
      .filter((item) => item.uuid !== currentItem.uuid)
      .filter((item) => !dismissedIds.includes(item.uuid))
      .filter((item) => !history.includes(item.uuid))
      .map((item) => scoreCandidate(currentItem, item, preferences, recommendation.recommended_collection_uuid))
      .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title, "zh-CN"))
      .slice(0, 8);
  }, [currentItem, dismissedIds, history, items, likedItems, recommendation.recommended_collection_uuid]);

  const nextEntry = queue[0] ?? null;
  const deckIndex = Math.max(0, Math.min(queue.length - 1, mobileDeckIndex));
  const deckEntry = queue[deckIndex] ?? null;
  const signals = topSignals(likedItems);
  const topSignalText = signals[0] ? `${signals[0].bucket} · ${signals[0].key}` : "暂无";

  const explanationLines = recommendation.explanation?.reason_lines ?? recommendation.evidence?.llm_rerank?.reason_lines ?? [];

  function openCurrentSheet() {
    setSheet({
      title: currentItem.title,
      summary:
        nextEntry?.reason ??
        recommendation.explanation?.summary ??
        "当前没有更合适的候选，等待更多用户信号或重置。",
      chips: unique([...(currentItem.concept_labels ?? []), ...(currentItem.intent_labels ?? []), ...(currentItem.theme_labels ?? [])]).slice(0, 8),
      items: [
        `互动形态：${(currentItem.interaction_flags ?? []).join(" / ") || "none"}`,
        `内容标签：${(currentItem.content_tags ?? []).slice(0, 4).join(" / ") || "none"}`,
        `社区标签：${(currentItem.community_tags ?? []).slice(0, 4).join(" / ") || "none"}`,
        currentItem.cta_info?.brief_input ? `核心 CTA：${currentItem.cta_info.brief_input}` : "",
      ].filter(Boolean),
    });
  }

  function openEntrySheet(entry: QueueEntry) {
    setSheet({
      title: entry.candidate.title,
      summary: entry.reason,
      chips: unique([
        ...entry.evidence.conceptOverlap,
        ...entry.evidence.intentOverlap,
        ...entry.evidence.themeOverlap,
      ]).slice(0, 8),
      items: [
        `概念连续：${entry.evidence.conceptOverlap.join(" / ") || "none"}`,
        `玩法意图：${entry.evidence.intentOverlap.join(" / ") || "none"}`,
        `主题重合：${entry.evidence.themeOverlap.join(" / ") || "none"}`,
        `标签重合：${entry.evidence.tagOverlap.join(" / ") || "none"}`,
        `互动形态：${entry.evidence.interactionOverlap.join(" / ") || "none"}`,
        `社区连续：${entry.evidence.communityOverlap.join(" / ") || "none"}`,
        entry.candidate.cta_info?.brief_input ? `核心 CTA：${entry.candidate.cta_info.brief_input}` : "",
        entry.candidate.cta_info?.preset_description ? `玩法描述：${entry.candidate.cta_info.preset_description}` : "",
      ].filter(Boolean),
    });
  }

  function handleLike(id: string) {
    setLikedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setHistory((prev) => [...prev, id]);
    setCurrentId(id);
    setMobileDeckIndex(0);
    setActiveTab("next");
    setSheet(null);
  }

  function handleSkip(id: string) {
    setDismissedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setMobileDeckIndex((prev) => Math.max(0, prev - 1));
  }

  function resetAll() {
    setCurrentId(current.uuid);
    setLikedIds([]);
    setDismissedIds([]);
    setHistory([]);
    setMobileDeckIndex(0);
    setActiveTab("next");
    setSheet(null);
  }

  return (
    <main className="h-screen overflow-hidden bg-transparent px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
      <div className="mx-auto flex h-full max-w-[1500px] min-h-0 flex-col gap-4">
        <header className="flex-none">
          <div className="flex min-h-0 flex-col gap-4 xl:flex-row xl:items-stretch">
          <Card className="overflow-hidden border-white/10 bg-[#08131d]/76">
            <CardHeader className="gap-4 p-5 sm:p-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/62">
                <Layers3 className="h-3.5 w-3.5" />
                Context-Driven Recommendation Demo
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="space-y-2">
                  <CardTitle className="text-2xl sm:text-4xl">点赞后继续推荐</CardTitle>
                  <CardDescription className="max-w-3xl text-sm text-white/70 sm:text-base">
                    推荐被放在第一优先位。你先看“下一条”，再决定点赞、跳过，或者回头查看当前种子和完整列表。
                  </CardDescription>
                </div>
                <Button onClick={resetAll} size="sm" variant="secondary" className="w-fit">
                  <RotateCcw className="h-4 w-4" />
                  重置
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SignalChip label={`当前 ${currentItem.title}`} />
                {nextEntry ? <ArrowRight className="h-4 w-4 text-white/36" /> : null}
                {nextEntry ? <SignalChip label={`推荐 ${nextEntry.candidate.title}`} /> : null}
                <SignalChip label={`候选 ${queue.length}`} />
                {likedIds.length > 0 ? <SignalChip label={`偏好信号 ${likedIds.length}`} /> : null}
              </div>
            </CardHeader>
          </Card>

          <Card className="border-white/10 bg-[#08131d]/72 xl:w-[360px] xl:shrink-0">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Rerank Summary</CardTitle>
              <CardDescription className="text-sm">
                {recommendation.explanation?.summary ?? recommendation.recommendation_reason ?? "No explanation available."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-5 pb-5">
              <div className="grid grid-cols-2 gap-3">
                <StatTile accent label="Recommended" value={nextEntry?.candidate.title ?? "None"} />
                <StatTile label="Confidence" value={String(recommendation.evidence?.top_candidate_confidence ?? recommendation.evidence?.llm_rerank?.confidence ?? "unknown")} />
                <StatTile label="Candidates" value={recommendation.evidence?.candidate_count ?? normalized.candidate_count} />
                <StatTile label="Top Signal" value={topSignalText} />
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm leading-6 text-white/68">
                <div>Selection rule: {recommendation.evidence?.selection_rule ?? "unknown"}</div>
                <div>Seed mode: {recommendation.evidence?.current_seed_mode ?? "unknown"}</div>
              </div>
            </CardContent>
          </Card>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Card className="flex min-h-0 flex-1 flex-col border-white/10 bg-[#08131d]/72">
            <CardHeader className="gap-4 p-5 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-white/45">主视图</div>
                  <CardTitle className="mt-1 text-xl">Focus Views</CardTitle>
                </div>
              </div>
              <div className="grid grid-cols-3 rounded-full border border-white/10 bg-white/6 p-1">
                {[
                  { id: "next", label: "推荐" },
                  { id: "queue", label: "列表" },
                  { id: "current", label: "当前" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`rounded-full px-3 py-2 text-sm transition ${activeTab === tab.id ? "bg-emerald-400 text-[#07111a]" : "text-white/72"}`}
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 pb-5">
              {activeTab === "current" ? (
                <Card className="overflow-hidden border-white/8 bg-[#0a1723]">
                  <CardContent className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="lg:max-w-[180px]">
                      <CollectionCover item={currentItem} />
                    </div>
                    <div className="grid gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <SignalChip label="Current" />
                        <SignalChip label={nextEntry ? `Next ${nextEntry.score}` : "No Queue"} />
                        <SignalChip label={(currentItem.source_feed_item?.recall_sources ?? []).slice(0, 2).join(" / ") || "seed"} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-white">{currentItem.title}</h3>
                        <p className="text-sm leading-6 text-white/68">
                          当前基于《{currentItem.title}》继续推荐。点赞会强化用户信号，跳过会从候选池移除，下一条推荐即时重算。
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {unique([
                          ...(currentItem.concept_labels ?? []),
                          ...(currentItem.intent_labels ?? []),
                          ...(currentItem.theme_labels ?? []),
                        ])
                          .slice(0, 6)
                          .map((chip) => (
                            <SignalChip key={chip} label={chip} />
                          ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                        <Button asChild variant="outline" className="border-white/12 bg-transparent text-white hover:bg-white/6">
                          <Link href={currentItem.collection_link ?? "#"} rel="noreferrer" target="_blank">
                            <ExternalLink className="h-4 w-4" />
                            打开
                          </Link>
                        </Button>
                        <Button onClick={openCurrentSheet} variant="secondary">
                          <Sparkles className="h-4 w-4" />
                          理由
                        </Button>
                        <Button onClick={() => handleSkip(currentItem.uuid)} variant="secondary">
                          <X className="h-4 w-4" />
                          跳过
                        </Button>
                        <Button onClick={() => handleLike(currentItem.uuid)}>
                          <Heart className="h-4 w-4" />
                          点赞
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {activeTab === "next" ? (
                nextEntry ? (
                  <CollectionCard
                    entry={nextEntry}
                    label="Recommended"
                    onDetail={() => openEntrySheet(nextEntry)}
                    onLike={() => handleLike(nextEntry.candidate.uuid)}
                    onSkip={() => handleSkip(nextEntry.candidate.uuid)}
                    compact
                  />
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 p-8 text-center text-sm text-white/60">
                    当前没有可推荐的下一条作品。
                  </div>
                )
              ) : null}

              {activeTab === "queue" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-white/58">推荐列表默认按 rerank 排序，移动端按 deck 浏览。</p>
                    <div className="flex items-center gap-2 xl:hidden">
                      <Button
                        disabled={deckIndex <= 0}
                        onClick={() => setMobileDeckIndex((value) => Math.max(0, value - 1))}
                        size="sm"
                        variant="secondary"
                      >
                        上一张
                      </Button>
                      <span className="text-xs text-white/55">
                        {queue.length ? `${deckIndex + 1} / ${queue.length}` : "0 / 0"}
                      </span>
                      <Button
                        disabled={deckIndex >= queue.length - 1}
                        onClick={() => setMobileDeckIndex((value) => Math.min(queue.length - 1, value + 1))}
                        size="sm"
                        variant="secondary"
                      >
                        下一张
                      </Button>
                    </div>
                  </div>

                  {deckEntry ? (
                    <div className="xl:hidden">
                      <CollectionCard
                        entry={deckEntry}
                        label={`#${deckIndex + 1}`}
                        onDetail={() => openEntrySheet(deckEntry)}
                        onLike={() => handleLike(deckEntry.candidate.uuid)}
                        onSkip={() => handleSkip(deckEntry.candidate.uuid)}
                        compact
                      />
                    </div>
                  ) : null}

                  <div className="hidden gap-3 xl:grid">
                    {queue.map((entry, index) => (
                      <RankedQueueRow
                        key={entry.candidate.uuid}
                        entry={entry}
                        index={index}
                        onDetail={() => openEntrySheet(entry)}
                        onLike={() => handleLike(entry.candidate.uuid)}
                        onSkip={() => handleSkip(entry.candidate.uuid)}
                      />
                    ))}
                  </div>

                  {!queue.length ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 p-8 text-center text-sm text-white/60">
                      候选已经用尽，点击重置重新开始。
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
            </Card>
          </div>

          <aside className="flex min-h-0 flex-col gap-4 xl:w-[340px] xl:shrink-0">
            <Card className="border-white/10 bg-[#08131d]/72">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base">用户信号</CardTitle>
                <CardDescription>点赞后这里会持续累积偏好状态。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Liked" value={likedItems.length} />
                  <StatTile label="Dismissed" value={dismissedIds.length} />
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium text-white">已点赞</div>
                  <div className="flex flex-wrap gap-2">
                    {likedItems.length ? likedItems.map((item) => <SignalChip key={item.uuid} label={item.title} />) : <p className="text-sm text-white/56">还没有点赞行为。</p>}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium text-white">偏好标签</div>
                  <div className="flex flex-wrap gap-2">
                    {signals.length ? (
                      signals.map((signal) => (
                        <SignalChip key={`${signal.bucket}:${signal.key}`} label={`${signal.bucket} · ${signal.key} ×${signal.value}`} />
                      ))
                    ) : (
                      <p className="text-sm text-white/56">点赞后会在这里聚合偏好信号。</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#08131d]/72">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base">Recall Surface</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-5 pb-5 text-sm leading-6 text-white/68">
                <p>Sources: {formatListLike(normalized.recall_summary?.sources, "unknown")}</p>
                <p>Search queries: {formatListLike(normalized.recall_summary?.search_queries, "none")}</p>
                <p>Search sources: {formatListLike(normalized.recall_summary?.search_sources, "none")}</p>
                <p>Merged candidates: {normalized.recall_summary?.merged_candidate_count ?? normalized.candidate_count}</p>
              </CardContent>
            </Card>

            <Card className="min-h-0 border-white/10 bg-[#08131d]/72">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base">Explanation & Fallback</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5 text-sm text-white/68">
                <div className="space-y-2">
                  {explanationLines.length ? explanationLines.map((line) => <p key={line}>{line}</p>) : <p>No LLM explanation lines.</p>}
                </div>
                {(recommendation.fallback_candidates ?? []).slice(0, 3).map((item) => (
                  <div key={item.uuid} className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-white">{item.title}</strong>
                      <span className="text-xs text-white/52">{item.score} pts</span>
                    </div>
                    <p className="mt-2 text-sm text-white/62">{item.reason_lines?.[0] ?? "No explanation."}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>

      {sheet ? (
        <>
          <button
            aria-label="Close sheet"
            className="fixed inset-0 z-40 bg-[#02070b]/60 backdrop-blur-sm"
            onClick={() => setSheet(null)}
            type="button"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl rounded-t-[2rem] border border-white/10 bg-[#09141e] p-5 shadow-2xl sm:p-6">
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/16" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/42">推荐理由</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">{sheet.title}</h2>
              </div>
              <Button onClick={() => setSheet(null)} size="sm" variant="secondary">
                关闭
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/70">{sheet.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {sheet.chips.length ? sheet.chips.map((chip) => <SignalChip key={chip} label={chip} />) : <SignalChip label="no signal" />}
            </div>
            <div className="mt-5 space-y-2">
              {sheet.items.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm leading-6 text-white/68">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
