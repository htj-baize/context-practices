"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ExternalLink,
  Heart,
  LayoutPanelLeft,
  Layers3,
  PanelRightClose,
  PanelRightOpen,
  Radar,
  RotateCcw,
  Sparkles,
  Target,
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

type MainTab = "next" | "queue" | "current";
type SideTab = "summary" | "session" | "explain";
type NextPanelTab = "reason" | "overlap" | "current";

type SheetState = {
  label: string;
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
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-slate-300">{label}</span>
  );
}

function StatTile({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className={`min-w-0 rounded-2xl border px-3 py-3 ${
        accent ? "border-emerald-400/18 bg-emerald-400/[0.08]" : "border-white/8 bg-white/[0.03]"
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 line-clamp-2 break-words text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function CollectionCover({ item }: { item: NetaCollectionProfile }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-slate-100">
      {item.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={item.title} className="h-full w-full object-cover" src={item.cover_url} />
      ) : (
        <div
          className="flex h-full w-full items-end p-5 text-base font-semibold text-white/88"
          style={{ background: coverFallback(item.title) }}
        >
          {item.title}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/55 via-transparent to-transparent" />
    </div>
  );
}

function CompactCover({ item }: { item: NetaCollectionProfile }) {
  return (
    <div className="relative h-22 w-18 overflow-hidden rounded-2xl bg-slate-100 sm:h-24 sm:w-20">
      {item.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={item.title} className="h-full w-full object-cover" src={item.cover_url} />
      ) : (
        <div className="h-full w-full" style={{ background: coverFallback(item.title) }} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/42 via-transparent to-transparent" />
    </div>
  );
}

function SpotlightCard({
  eyebrow,
  title,
  subtitle,
  item,
  chips,
  accent = false,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  item: NetaCollectionProfile;
  chips: string[];
  accent?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div
      className={`rounded-[1.6rem] border p-4 sm:p-5 ${
        accent ? "border-emerald-400/18 bg-emerald-400/[0.08]" : "border-white/8 bg-white/[0.03]"
      }`}
    >
      <div className="grid gap-4 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-start">
        <CompactCover item={item} />
        <div className="grid gap-3">
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{eyebrow}</div>
            <div className="text-base font-semibold leading-tight text-white sm:text-lg">{title}</div>
            <p className="text-[13px] leading-6 text-slate-300">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.length ? chips.map((chip) => <SignalChip key={chip} label={chip} />) : <SignalChip label="待补充信号" />}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
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
    <Card className="overflow-hidden border-white/8 bg-white/[0.04] shadow-none">
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
            <h3 className={`${compact ? "text-base" : "text-lg"} font-semibold leading-tight text-white`}>{item.title}</h3>
            <p className={`text-slate-300 ${compact ? "line-clamp-2 text-[13px] leading-5" : "text-[13px] leading-6"}`}>{entry.reason}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unique([...(item.concept_labels ?? []), ...(item.intent_labels ?? []), ...(item.theme_labels ?? [])])
              .slice(0, compact ? 4 : 6)
              .map((chip) => (
                <SignalChip key={chip} label={chip} />
              ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            {(item.interaction_flags ?? []).length > 0 ? <SignalChip label={`互动 ${(item.interaction_flags ?? []).join(" / ")}`} /> : null}
            {(item.content_tags ?? []).length > 0 ? <SignalChip label={`标签 ${(item.content_tags ?? []).slice(0, 2).join(" / ")}`} /> : null}
            {(item.community_tags ?? []).length > 0 ? <SignalChip label={`社区 ${(item.community_tags ?? []).slice(0, 2).join(" / ")}`} /> : null}
          </div>
          <div className={`grid gap-2 ${compact ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2 sm:flex sm:flex-wrap"}`}>
            <Button asChild variant="outline">
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
    <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.06]">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Rank</div>
        <div className="mt-1 text-xl font-semibold text-white">{index + 1}</div>
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            {item.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={item.title} className="h-full w-full object-cover" src={item.cover_url} />
            ) : (
              <div className="h-full w-full" style={{ background: coverFallback(item.title) }} />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{item.title}</div>
            <div className="truncate text-[13px] text-slate-400">{entry.reason}</div>
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

function RailButton({
  active,
  label,
  hint,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`w-full rounded-[1.15rem] border px-3 py-3 text-left transition ${
        active
          ? "border-emerald-400/40 bg-emerald-400/12 text-white shadow-[0_10px_30px_rgba(16,185,129,0.12)]"
          : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/12 hover:bg-white/[0.05]"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            active ? "bg-emerald-400/18 text-emerald-200" : "bg-white/[0.05] text-slate-400"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium">{label}</div>
          <div className="mt-1 text-[12px] leading-5 text-slate-400">{hint}</div>
        </div>
      </div>
    </button>
  );
}

function MinimalVisualCard({
  eyebrow,
  title,
  item,
  accent = false,
  chips = [],
  footer,
  className = "",
  overlayActions,
}: {
  eyebrow: string;
  title: string;
  item: NetaCollectionProfile;
  accent?: boolean;
  chips?: string[];
  footer?: ReactNode;
  className?: string;
  overlayActions?: ReactNode;
}) {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-[1.25rem] border ${
        accent ? "border-emerald-400/18 bg-emerald-400/[0.08]" : "border-white/8 bg-white/[0.03]"
      } ${className}`}
    >
      <Link href={item.collection_link ?? "#"} rel="noreferrer" target="_blank" className="group block flex-1">
        <div className="relative h-full min-h-0 overflow-hidden bg-black/20">
          {item.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={item.title} className="h-full w-full object-cover" src={item.cover_url} />
          ) : (
            <div className="h-full w-full" style={{ background: coverFallback(item.title) }} />
          )}
          {chips.length ? (
            <div className="absolute inset-x-0 top-0 z-10 p-3 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
              <div className="flex flex-wrap gap-2">
                {chips.slice(0, 3).map((chip) => (
                  <span key={chip} className="rounded-full border border-white/14 bg-[#07111a]/76 px-2.5 py-1 text-[11px] text-white/88 backdrop-blur-sm">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {overlayActions ? (
            <div className="absolute inset-x-0 bottom-0 z-10 p-3 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
              <div className="flex items-center justify-end gap-2">{overlayActions}</div>
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07111a] via-[#07111a]/50 to-transparent p-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{eyebrow}</div>
            <div className="mt-2 line-clamp-2 text-[18px] font-semibold leading-tight text-white">{title}</div>
          </div>
        </div>
      </Link>
      {footer ? <div className="min-h-[52px] border-t border-white/8 p-3">{footer}</div> : null}
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
  const [mainTab, setMainTab] = useState<MainTab>("next");
  const [sideTab, setSideTab] = useState<SideTab>("summary");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [insightCollapsed, setInsightCollapsed] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [nextPanelTab, setNextPanelTab] = useState<NextPanelTab>("reason");
  const dragStartX = useRef<number | null>(null);

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
  const sessionTrail = history
    .map((id) => items.get(id))
    .filter((item): item is NetaCollectionProfile => Boolean(item));
  const recommendationConfidence = String(
    recommendation.evidence?.top_candidate_confidence ?? recommendation.evidence?.llm_rerank?.confidence ?? "unknown"
  );

  function openCurrentSheet() {
    setSheet({
      label: "画像",
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
      label: "理由",
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
    setMainTab("next");
    setSideTab("session");
    setNextPanelTab("current");
    setSheet(null);
    setDragOffset(0);
  }

  function handleSkip(id: string) {
    setDismissedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setMobileDeckIndex((prev) => Math.max(0, prev - 1));
    setNextPanelTab("reason");
    setDragOffset(0);
  }

  function resetAll() {
    setCurrentId(current.uuid);
    setLikedIds([]);
    setDismissedIds([]);
    setHistory([]);
    setMobileDeckIndex(0);
    setMainTab("next");
    setSideTab("summary");
    setNextPanelTab("reason");
    setSheet(null);
    setDragOffset(0);
  }

  function commitSwipe(direction: "like" | "skip") {
    if (!nextEntry) {
      return;
    }
    if (direction === "like") {
      handleLike(nextEntry.candidate.uuid);
      return;
    }
    handleSkip(nextEntry.candidate.uuid);
  }

  function beginDrag(clientX: number) {
    dragStartX.current = clientX;
  }

  function moveDrag(clientX: number) {
    if (dragStartX.current === null) {
      return;
    }
    setDragOffset(clientX - dragStartX.current);
  }

  function endDrag() {
    if (dragStartX.current === null) {
      return;
    }
    if (dragOffset > 120) {
      commitSwipe("like");
    } else if (dragOffset < -120) {
      commitSwipe("skip");
    } else {
      setDragOffset(0);
    }
    dragStartX.current = null;
  }

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_22%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_24%),linear-gradient(180deg,#07111a_0%,#09131d_100%)]">
      <div className="mx-auto flex h-screen max-w-[1760px] flex-col overflow-hidden border-x border-white/8 bg-[#08121c]/92 shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/8 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/22 bg-emerald-400/10 text-emerald-200">
              <Layers3 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-white">Neta Next Collection</div>
              <div className="truncate text-[11px] text-slate-400">下一条作品推荐</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <SignalChip label={`候选 ${queue.length}`} />
              <SignalChip label={`已点赞 ${likedItems.length}`} />
            </div>
            <Button onClick={resetAll} size="sm" variant="secondary" className="w-fit border border-white/8 bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]">
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="shrink-0 border-b border-white/8 bg-[#0a1621]/88 lg:w-[248px] lg:border-b-0 lg:border-r">
            <div className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible lg:p-4">
              <div className="hidden rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-3 lg:block">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Mode</div>
                <div className="mt-2 text-[13px] leading-5 text-slate-300">
                  左边切视图，中间看作品，右边看补充说明。
                </div>
              </div>

              <div className="grid min-w-[220px] gap-2 lg:min-w-0">
                <RailButton
                  active={mainTab === "next"}
                  hint="聚焦当前最值得前进的一条推荐。"
                  icon={<ArrowRight className="h-4 w-4" />}
                  label="Next pick"
                  onClick={() => setMainTab("next")}
                />
                <RailButton
                  active={mainTab === "queue"}
                  hint="检查全部候选顺序，手动重选下一条。"
                  icon={<Radar className="h-4 w-4" />}
                  label="Candidate queue"
                  onClick={() => setMainTab("queue")}
                />
                <RailButton
                  active={mainTab === "current"}
                  hint="查看当前 seed 的标签、CTA 与来源。"
                  icon={<Target className="h-4 w-4" />}
                  label="Current seed"
                  onClick={() => setMainTab("current")}
                />
              </div>

            </div>
          </aside>

          <section className="min-h-0 min-w-0 flex-1 bg-[#0b1722]">
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-white/8 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">Flow</span>
                      <span className="rounded-full border border-emerald-400/22 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
                        {mainTab === "next" ? "Next pick" : mainTab === "queue" ? "Candidate queue" : "Current seed"}
                      </span>
                    </div>
                    <div className="mt-2 flex min-w-0 items-center gap-2 overflow-hidden text-[13px] text-slate-300">
                      <span className="min-w-0 truncate whitespace-nowrap">当前作品：{currentItem.title}</span>
                      {nextEntry ? (
                        <>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                          <span className="min-w-0 truncate whitespace-nowrap text-white">下一条：{nextEntry.candidate.title}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => setInsightCollapsed((value) => !value)}
                      size="sm"
                      variant="secondary"
                      className="hidden border border-white/8 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08] lg:inline-flex"
                    >
                      {insightCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                      {insightCollapsed ? "展开洞察" : "收起洞察"}
                    </Button>
                  </div>
                </div>
              </div>

              <div
                className={`min-h-0 flex-1 px-6 py-5 sm:px-8 ${
                  mainTab === "next" ? "overflow-hidden" : "overflow-y-auto"
                }`}
              >
                {mainTab === "next" ? (
                  <div className="grid h-full min-h-0 gap-8 xl:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.72fr)]">
                    <div className="flex min-h-0 flex-col rounded-[1.4rem] border border-emerald-400/18 bg-white/[0.03] p-3 overflow-hidden">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/70">Next pick</div>
                          <div className="mt-1 text-[13px] text-slate-400">当前推荐作品。</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {nextEntry ? (
                            <Button
                              onClick={() => openEntrySheet(nextEntry)}
                              size="sm"
                              variant="secondary"
                              className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
                            >
                              <Sparkles className="h-4 w-4" />
                              理由
                            </Button>
                          ) : null}
                          <Button
                            onClick={openCurrentSheet}
                            size="sm"
                            variant="secondary"
                            className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
                          >
                            <Sparkles className="h-4 w-4" />
                            当前画像
                          </Button>
                          {nextEntry ? <SignalChip label={`${nextEntry.score} pts`} /> : null}
                        </div>
                      </div>

                      {nextEntry ? (
                        <div className="mx-auto flex min-h-0 w-full max-w-[390px] flex-col gap-3">
                          <MinimalVisualCard
                            className="aspect-[4/4.55]"
                            accent
                            eyebrow="Recommended"
                            chips={unique([
                              ...nextEntry.evidence.conceptOverlap,
                              ...nextEntry.evidence.intentOverlap,
                              ...nextEntry.evidence.themeOverlap,
                            ])}
                            item={nextEntry.candidate}
                            title={nextEntry.candidate.title}
                            overlayActions={
                              <>
                                <Button
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    openEntrySheet(nextEntry);
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  className="border border-white/12 bg-[#07111a]/76 text-slate-100 backdrop-blur-sm hover:bg-[#07111a]"
                                >
                                  <Sparkles className="h-4 w-4" />
                                  理由
                                </Button>
                              </>
                            }
                            footer={
                              <div className="text-[12px] text-slate-500">点击图片打开作品</div>
                            }
                          />
                          <div
                            className="grid shrink-0 grid-cols-2 gap-2"
                            onMouseLeave={() => setDragOffset(0)}
                            onMouseMove={(event) => moveDrag(event.clientX)}
                            onMouseUp={endDrag}
                            onTouchEnd={endDrag}
                            onTouchMove={(event) => moveDrag(event.touches[0]?.clientX ?? 0)}
                          >
                            <Button
                              onMouseDown={(event) => beginDrag(event.clientX)}
                              onTouchStart={(event) => beginDrag(event.touches[0]?.clientX ?? 0)}
                              onClick={() => handleSkip(nextEntry.candidate.uuid)}
                              variant="secondary"
                              className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
                            >
                              <X className="h-4 w-4" />
                              跳过
                            </Button>
                            <Button
                              onMouseDown={(event) => beginDrag(event.clientX)}
                              onTouchStart={(event) => beginDrag(event.touches[0]?.clientX ?? 0)}
                              onClick={() => handleLike(nextEntry.candidate.uuid)}
                            >
                              <Heart className="h-4 w-4" />
                              点赞
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-black/20 p-8 text-center text-sm text-slate-400">
                          当前没有可推荐的下一条作品。
                        </div>
                      )}
                    </div>

                    <div className="flex min-h-0 flex-col rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4 overflow-hidden">
                      <div className="grid gap-3">
                        <div className="flex shrink-0 items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                          <Bot className="h-3.5 w-3.5" />
                          Why this one
                        </div>
                        <div className="text-[13px] leading-6 text-slate-400">推荐理由展示在右侧。</div>
                        {nextEntry ? (
                          <div className="flex min-w-0 flex-wrap gap-2">
                            <span className="max-w-full truncate whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-slate-300">
                              {nextEntry.reason}
                            </span>
                            {unique([
                              ...nextEntry.evidence.conceptOverlap,
                              ...nextEntry.evidence.intentOverlap,
                              ...nextEntry.evidence.themeOverlap,
                            ])
                              .slice(0, 2)
                              .map((chip) => (
                                <SignalChip key={chip} label={chip} />
                              ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl border border-white/8 bg-black/20 p-1">
                        {[
                          { id: "reason", label: "理由" },
                          { id: "overlap", label: "重合" },
                          { id: "current", label: "当前" },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            className={`rounded-lg px-3 py-2 text-[12px] transition ${
                              nextPanelTab === tab.id ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.04]"
                            }`}
                            onClick={() => setNextPanelTab(tab.id as NextPanelTab)}
                            type="button"
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
                        {nextPanelTab === "reason" ? (
                          <div className="flex h-full min-h-0 flex-col rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3">
                            <div className="min-h-0 flex-1 overflow-y-auto pr-2 text-[14px] leading-7 text-slate-300">
                              {explanationLines.length ? explanationLines.slice(0, 6).map((line) => <p key={line}>{line}</p>) : <p>暂无 explanation lines。</p>}
                            </div>
                          </div>
                        ) : null}
                        {nextPanelTab === "overlap" && nextEntry ? (
                          <div className="h-full overflow-y-auto space-y-3 pr-2">
                            <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">推荐重合点</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {unique([
                                  ...nextEntry.evidence.conceptOverlap,
                                  ...nextEntry.evidence.intentOverlap,
                                  ...nextEntry.evidence.themeOverlap,
                                  ...nextEntry.evidence.tagOverlap,
                                ])
                                  .slice(0, 8)
                                  .map((chip) => (
                                    <SignalChip key={chip} label={chip} />
                                  ))}
                              </div>
                            </div>
                            <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px] leading-6 text-slate-300">
                              <div>互动形态：{nextEntry.evidence.interactionOverlap.join(" / ") || "暂无"}</div>
                              <div>社区延续：{nextEntry.evidence.communityOverlap.join(" / ") || "暂无"}</div>
                              <div>候选来源：{(nextEntry.candidate.source_feed_item?.recall_sources ?? []).join(" / ") || "暂无"}</div>
                            </div>
                          </div>
                        ) : null}
                        {nextPanelTab === "current" ? (
                          <div className="h-full overflow-y-auto pr-2">
                            <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">当前作品</div>
                              <div className="mt-2 text-sm font-medium text-white">{currentItem.title}</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {unique([...(currentItem.concept_labels ?? []), ...(currentItem.intent_labels ?? []), ...(currentItem.theme_labels ?? [])])
                                  .slice(0, 6)
                                  .map((chip) => (
                                    <SignalChip key={chip} label={chip} />
                                  ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {mainTab === "current" ? (
                  <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                      <CollectionCover item={currentItem} />
                    </div>
                    <div className="space-y-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <SignalChip label="Current seed" />
                        <SignalChip label={(currentItem.source_feed_item?.recall_sources ?? []).slice(0, 2).join(" / ") || "seed"} />
                        <SignalChip label={`下一条分数 ${nextEntry?.score ?? "-"}`} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{currentItem.title}</h2>
                        <p className="mt-2 text-[13px] leading-6 text-slate-300">
                          当前种子决定这条推荐链路的上下文边界。它的标签、CTA 和互动形态会直接影响 rerank。
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {unique([
                          ...(currentItem.concept_labels ?? []),
                          ...(currentItem.intent_labels ?? []),
                          ...(currentItem.theme_labels ?? []),
                          ...(currentItem.content_tags ?? []),
                        ])
                          .slice(0, 10)
                          .map((chip) => (
                            <SignalChip key={chip} label={chip} />
                          ))}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-[13px] leading-6 text-slate-300">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">CTA</div>
                          <div className="mt-2">{currentItem.cta_info?.brief_input ?? "No CTA provided."}</div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-[13px] leading-6 text-slate-300">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Preset</div>
                          <div className="mt-2">{currentItem.cta_info?.preset_description ?? "No preset description."}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {mainTab === "queue" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] text-slate-300">候选池按 rerank 分数排序。移动端按 deck 浏览，桌面端按列表浏览。</div>
                      <div className="hidden items-center gap-2 xl:flex">
                        <SignalChip label={`Queue ${queue.length}`} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 xl:hidden">
                      <Button
                        disabled={deckIndex <= 0}
                        onClick={() => setMobileDeckIndex((value) => Math.max(0, value - 1))}
                        size="sm"
                        variant="secondary"
                        className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
                      >
                        上一张
                      </Button>
                      <span className="text-xs text-slate-500">{queue.length ? `${deckIndex + 1} / ${queue.length}` : "0 / 0"}</span>
                      <Button
                        disabled={deckIndex >= queue.length - 1}
                        onClick={() => setMobileDeckIndex((value) => Math.min(queue.length - 1, value + 1))}
                        size="sm"
                        variant="secondary"
                        className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
                      >
                        下一张
                      </Button>
                    </div>

                    {deckEntry ? (
                      <div className="xl:hidden">
                        <CollectionCard
                          entry={deckEntry}
                          label={`候选 #${deckIndex + 1}`}
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
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <aside
            className={`shrink-0 border-t border-white/8 bg-[#08121c] transition-[width] duration-200 lg:border-l lg:border-t-0 ${
              insightCollapsed ? "lg:w-[68px]" : "lg:w-[360px]"
            }`}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-white/8 px-3 py-3">
                <div className={`${insightCollapsed ? "hidden" : "block"}`}>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Insights</div>
                  <div className="mt-1 text-[13px] text-slate-300">会话摘要与解释</div>
                </div>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08]"
                  onClick={() => setInsightCollapsed((value) => !value)}
                  type="button"
                >
                  {insightCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                </button>
              </div>

              {insightCollapsed ? (
                <div className="hidden flex-1 flex-col items-center gap-3 py-4 lg:flex">
                  {[
                    { id: "summary", icon: <LayoutPanelLeft className="h-4 w-4" /> },
                    { id: "session", icon: <Layers3 className="h-4 w-4" /> },
                    { id: "explain", icon: <Sparkles className="h-4 w-4" /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                        sideTab === tab.id
                          ? "border-emerald-400/30 bg-emerald-400/14 text-emerald-200"
                          : "border-white/8 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                      }`}
                      onClick={() => {
                        setSideTab(tab.id as SideTab);
                        setInsightCollapsed(false);
                      }}
                      type="button"
                    >
                      {tab.icon}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-1 border-b border-white/8 p-3">
                    {[
                      { id: "summary", label: "摘要" },
                      { id: "session", label: "会话" },
                      { id: "explain", label: "解释" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        className={`rounded-xl px-3 py-2 text-[12px] transition ${
                          sideTab === tab.id ? "bg-white/[0.09] text-white" : "text-slate-400 hover:bg-white/[0.04]"
                        }`}
                        onClick={() => setSideTab(tab.id as SideTab)}
                        type="button"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    {sideTab === "summary" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-emerald-400/18 bg-emerald-400/[0.08] px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">本轮推荐</div>
                            <div className="mt-2 text-sm font-medium text-white">{nextEntry?.candidate.title ?? "暂无"}</div>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">置信度</div>
                            <div className="mt-2 text-sm font-medium text-white">{recommendationConfidence}</div>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">候选数</div>
                            <div className="mt-2 text-sm font-medium text-white">
                              {recommendation.evidence?.candidate_count ?? normalized.candidate_count}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">主信号</div>
                            <div className="mt-2 text-sm font-medium text-white">{topSignalText}</div>
                          </div>
                        </div>
                        <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px] leading-6 text-slate-300">
                          <div>推荐结果：{nextEntry?.candidate.title ?? "暂无"}</div>
                          <div>主要方向：{topSignalText}</div>
                          <div>候选来源：{formatListLike(normalized.recall_summary?.sources, "unknown")}</div>
                        </div>
                      </div>
                    ) : null}

                    {sideTab === "session" ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">已点赞</div>
                            <div className="mt-2 text-sm font-medium text-white">{likedItems.length}</div>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">已跳过</div>
                            <div className="mt-2 text-sm font-medium text-white">{dismissedIds.length}</div>
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">偏好标签</div>
                          <div className="flex flex-wrap gap-2">
                            {signals.length ? (
                              signals.map((signal) => (
                                <SignalChip key={`${signal.bucket}:${signal.key}`} label={`${signal.bucket} · ${signal.key} ×${signal.value}`} />
                              ))
                            ) : (
                              <p className="text-[13px] text-slate-400">还没有足够信号，先点几次喜欢试试。</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">会话轨迹</div>
                          <div className="flex flex-wrap gap-2">
                            {sessionTrail.length ? (
                              sessionTrail.map((item) => <SignalChip key={item.uuid} label={item.title} />)
                            ) : (
                              <p className="text-[13px] text-slate-400">用户走过的推荐路径会显示在这里。</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {sideTab === "explain" ? (
                      <div className="space-y-3 text-[13px] text-slate-300">
                        <div className="space-y-2 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                          {explanationLines.length ? explanationLines.map((line) => <p key={line}>{line}</p>) : <p>暂无 explanation lines。</p>}
                        </div>
                        {(recommendation.fallback_candidates ?? []).slice(0, 3).map((item) => (
                          <div key={item.uuid} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between gap-4">
                              <strong className="text-white">{item.title}</strong>
                              <span className="text-xs text-slate-500">{item.score} pts</span>
                            </div>
                            <p className="mt-2 text-[13px] text-slate-400">{item.reason_lines?.[0] ?? "No explanation."}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>

        <div className="shrink-0 border-t border-white/8 bg-[#08121c]/98 px-4 py-3 sm:px-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_repeat(5,minmax(0,0.7fr))]">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">当前作品</div>
              <div className="mt-2 truncate text-sm font-medium text-white">{currentItem.title}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">主信号</div>
              <div className="mt-2 text-sm font-medium text-white">{topSignalText}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">置信度</div>
              <div className="mt-2 text-sm font-medium text-white">{recommendationConfidence}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">候选数</div>
              <div className="mt-2 text-sm font-medium text-white">{recommendation.evidence?.candidate_count ?? normalized.candidate_count}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">已赞</div>
              <div className="mt-2 text-sm font-medium text-white">{likedItems.length}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">跳过</div>
              <div className="mt-2 text-sm font-medium text-white">{dismissedIds.length}</div>
            </div>
          </div>
        </div>

        {sheet ? (
          <>
            <button
              aria-label="Close sheet"
              className="fixed inset-0 z-40 bg-[#02070b]/68 backdrop-blur-sm"
              onClick={() => setSheet(null)}
              type="button"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl rounded-[1.5rem] border border-white/10 bg-[#09141e] p-5 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-white/42">{sheet.label}</div>
                  <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{sheet.title}</h2>
                </div>
                <Button
                  onClick={() => setSheet(null)}
                  size="sm"
                  variant="secondary"
                  className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.1]"
                >
                  关闭
                </Button>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/70">{sheet.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {sheet.chips.length ? sheet.chips.map((chip) => <SignalChip key={chip} label={chip} />) : <SignalChip label="no signal" />}
              </div>
              <div className="mt-4 max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                {sheet.items.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm leading-6 text-white/68">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
