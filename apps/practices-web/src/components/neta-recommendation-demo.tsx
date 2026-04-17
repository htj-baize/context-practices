"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
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

type MainTab = "next" | "feed";
type SideTab = "summary" | "session" | "explain";
type NextPanelTab = "reason" | "overlap" | "current";

type SheetState = {
  label: string;
  title: string;
  summary: string;
  chips: string[];
  items: string[];
} | null;

type DismissReasonOption = {
  id: string;
  label: string;
  hint: string;
};

type LiveRecommendationResponse = DemoProps & {
  session: {
    currentCollectionUuid: string;
    likedCollectionUuids: string[];
    dismissedCollectionUuids: string[];
    seenCollectionUuids: string[];
    feedPageCount?: number;
  };
};

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

type FlowFeedResponse = {
  items: NetaCollectionProfile[];
  pageIndex: number;
  pageSize: number;
  hasNextPage: boolean;
  theme: string;
};

type FlowPageLoadOptions = {
  replace?: boolean;
  append?: boolean;
};

const weightConfig = {
  concept: 9,
  intent: 6,
  theme: 4,
  tag: 3,
  format: 2,
  interaction: 0,
  community: 1,
  preference: 2,
  recommendationBoost: 4,
};

const LOW_SIGNAL_TAGS = new Set(["捏捏", "捏ta学院", "捏ta", "捏ta學院", "捏ta学院", "捏Ta学院"].map((tag) => tag.toLowerCase()));
const DISMISS_REASON_OPTIONS: DismissReasonOption[] = [
  { id: "style", label: "画风不对", hint: "视觉风格不符合当前偏好" },
  { id: "theme", label: "题材无感", hint: "主题或设定没有兴趣" },
  { id: "interaction", label: "玩法不合适", hint: "CTA 或互动方式不想继续" },
  { id: "too-similar", label: "太像了", hint: "和刚看过的内容过于重复" },
  { id: "later", label: "先略过", hint: "不是明确讨厌，但这轮不想看" },
];

function unique(values: string[] = []): string[] {
  return [...new Set(values.filter(Boolean))];
}

function isLowSignalTag(tag: string): boolean {
  return LOW_SIGNAL_TAGS.has(tag.trim().toLowerCase());
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
  const interactionOverlap: string[] = [];
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
    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-white/[0.04]">
      {item.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={item.title} className="h-full w-full object-cover" src={item.cover_url} />
      ) : (
        <div className="h-full w-full bg-white/[0.03]" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/55 via-transparent to-transparent" />
    </div>
  );
}

function CollectionCard({
  entry,
  label,
  active = false,
  liked = false,
  disliked = false,
  onLike,
  onDismiss,
  onNext,
  onInspect,
}: {
  entry: QueueEntry;
  label: string;
  active?: boolean;
  liked?: boolean;
  disliked?: boolean;
  onLike: () => void;
  onDismiss: () => void;
  onNext: () => void;
  onInspect: () => void;
}) {
  const item = entry.candidate;
  const chips = unique([...(item.concept_labels ?? []), ...(item.intent_labels ?? []), ...(item.theme_labels ?? [])]).slice(0, 3);
  const compactReason = entry.reason.replace(/^概念连续：|^玩法意图：|^主题连续：|^标签连续：/, "");

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[1.25rem] border shadow-none transition ${
        liked
          ? "border-rose-400/40 bg-rose-400/[0.08]"
          : disliked
            ? "border-amber-400/28 bg-amber-400/[0.06]"
            : active
              ? "border-emerald-400/40 bg-emerald-400/[0.08]"
              : "border-white/8 bg-white/[0.04]"
      }`}
    >
      <div className="p-2.5">
        <button className="group block w-full text-left" onClick={onInspect} type="button">
          <div className="relative aspect-[4/4.35] overflow-hidden rounded-[1rem] bg-white/[0.04]">
            {item.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" src={item.cover_url} />
            ) : (
              <div className="h-full w-full bg-white/[0.03]" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07111a] via-[#07111a]/18 to-transparent" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-2.5">
              <span className="rounded-full border border-white/12 bg-[#07111a]/76 px-2 py-1 text-[10px] text-white/88 backdrop-blur-sm">
                {label}
              </span>
              {liked ? (
                <span className="rounded-full border border-rose-400/18 bg-rose-400/12 px-2 py-1 text-[10px] font-medium text-rose-200">
                  已喜欢
                </span>
              ) : disliked ? (
                <span className="rounded-full border border-amber-400/18 bg-amber-400/12 px-2 py-1 text-[10px] font-medium text-amber-200">
                  无感
                </span>
              ) : active ? (
                <span className="rounded-full border border-emerald-400/18 bg-emerald-400/12 px-2 py-1 text-[10px] font-medium text-emerald-200">
                  已查看
                </span>
              ) : null}
            </div>
            {chips.length ? (
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {chips.slice(0, 2).map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/14 bg-[#07111a]/76 px-2 py-1 text-[10px] text-white/88 backdrop-blur-sm transition md:opacity-80 md:group-hover:opacity-100"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-3 pb-3">
        <div className="space-y-1.5">
          <h3 className="truncate text-[15px] font-semibold leading-snug text-white" title={item.title}>
            {item.title}
          </h3>
          <p className="line-clamp-1 text-[12px] leading-5 text-slate-400">{compactReason || "点击卡片查看推荐理由"}</p>
        </div>
        <div className="mt-auto grid gap-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              aria-label="标记无感"
              onClick={onDismiss}
              size="sm"
              title="标记无感"
              variant="secondary"
              className="min-w-0 px-1.5"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              aria-label="看下一个"
              onClick={onNext}
              size="sm"
              title="看下一个"
              variant="secondary"
              className="min-w-0 px-1.5"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              aria-label={liked ? "取消点赞" : "喜欢这条"}
              onClick={onLike}
              size="sm"
              title={liked ? "取消点赞" : "喜欢这条"}
              className={`min-w-0 px-1.5 ${liked ? "bg-rose-500 text-white hover:bg-rose-500/90" : ""}`}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>{typeof item.like_count === "number" && item.like_count > 0 ? `${item.like_count} likes` : `${entry.score} pts`}</span>
            <Link className="transition hover:text-white" href={item.collection_link ?? "#"} rel="noreferrer" target="_blank">
              打开原作
            </Link>
          </div>
        </div>
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
            <div className="h-full w-full bg-white/[0.03]" />
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
  const [liveData, setLiveData] = useState<DemoProps>({ current, normalized, recommendation });
  const [profileStore, setProfileStore] = useState<Map<string, NetaCollectionProfile>>(() => {
    const byId = new Map<string, NetaCollectionProfile>();
    byId.set(current.uuid, current);
    for (const item of normalized.candidate_collections ?? []) {
      byId.set(item.uuid, item);
    }
    return byId;
  });

  const items = useMemo(() => {
    const byId = new Map<string, NetaCollectionProfile>();
    byId.set(liveData.current.uuid, liveData.current);
    for (const item of liveData.normalized.candidate_collections ?? []) {
      byId.set(item.uuid, item);
    }
    return byId;
  }, [liveData]);

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<"like" | "dismiss" | "next" | null>(null);
  const [pendingCandidateUuid, setPendingCandidateUuid] = useState<string | null>(null);
  const [mobileInsightsOpen, setMobileInsightsOpen] = useState(false);
  const [focusedCandidateUuid, setFocusedCandidateUuid] = useState<string | null>(null);
  const [dismissTarget, setDismissTarget] = useState<NetaCollectionProfile | null>(null);
  const [dismissReasonByCandidate, setDismissReasonByCandidate] = useState<Record<string, string>>({});
  const [flowItems, setFlowItems] = useState<(NetaCollectionProfile | null)[]>([]);
  const [flowNextPageIndex, setFlowNextPageIndex] = useState(0);
  const [flowHasNextPage, setFlowHasNextPage] = useState(true);
  const [flowTheme] = useState("热门");
  const [flowLoading, setFlowLoading] = useState(false);
  const [flowFocusedUuid, setFlowFocusedUuid] = useState<string | null>(null);
  const [flowDetailStore, setFlowDetailStore] = useState<Map<string, NetaCollectionProfile>>(new Map());
  const dragStartX = useRef<number | null>(null);

  function getProfileById(id: string): NetaCollectionProfile | null {
    return (
      profileStore.get(id) ??
      items.get(id) ??
      flowDetailStore.get(id) ??
      flowItems.find((item) => item?.uuid === id) ??
      null
    );
  }

  const currentItem = items.get(currentId) ?? profileStore.get(currentId) ?? liveData.current;
  const likedItems = likedIds
    .map((id) => getProfileById(id))
    .filter((item): item is NetaCollectionProfile => Boolean(item));

  const queue = useMemo(() => {
    const preferences = buildPreferenceBuckets(likedItems);
    return [...items.values()]
      .filter((item) => item.uuid !== currentItem.uuid)
      .filter((item) => !dismissedIds.includes(item.uuid))
      .filter((item) => !history.includes(item.uuid))
      .map((item) => scoreCandidate(currentItem, item, preferences, liveData.recommendation.recommended_collection_uuid))
      .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title, "zh-CN"));
  }, [currentItem, dismissedIds, history, items, likedItems, liveData.recommendation.recommended_collection_uuid]);

  const nextEntry = queue[0] ?? null;
  const focusedEntry = queue.find((entry) => entry.candidate.uuid === focusedCandidateUuid) ?? nextEntry;
  const flowVisibleItems = flowItems.filter((item): item is NetaCollectionProfile => Boolean(item));
  const flowFocusedPreview = flowItems.find((item) => item?.uuid === flowFocusedUuid) ?? flowVisibleItems[0] ?? null;
  const flowFocusedDetail = flowFocusedPreview ? flowDetailStore.get(flowFocusedPreview.uuid) ?? flowFocusedPreview : null;
  const panelTitle = mainTab === "feed" ? flowFocusedDetail?.title ?? "暂无" : nextEntry?.candidate.title ?? "暂无";
  const signals = topSignals(likedItems);
  const topSignalText = signals[0] ? `${signals[0].bucket} · ${signals[0].key}` : "暂无";

  const explanationLines =
    liveData.recommendation.explanation?.reason_lines ?? liveData.recommendation.evidence?.llm_rerank?.reason_lines ?? [];
  const sessionTrail = history
    .map((id) => getProfileById(id))
    .filter((item): item is NetaCollectionProfile => Boolean(item));
  const recommendationConfidence = String(
    liveData.recommendation.evidence?.top_candidate_confidence ?? liveData.recommendation.evidence?.llm_rerank?.confidence ?? "unknown"
  );
  const candidateCount = liveData.recommendation.evidence?.candidate_count ?? liveData.normalized.candidate_count;
  const recallSourcesLabel = formatListLike(liveData.normalized.recall_summary?.sources, "unknown");
  const activeFeedMode = liveData.normalized.recall_summary?.mode ?? mainTab;
  const shouldBootstrapRecommendation =
    mainTab === "next" &&
    !isRefreshing &&
    liveData.normalized.candidate_collections.length === 0 &&
    !liveData.recommendation.recommended_collection_uuid;

  async function refreshLiveRecommendation(
    nextState: {
      currentCollectionUuid: string;
      currentSource?: string;
      likedCollectionUuids: string[];
      dismissedCollectionUuids: string[];
      seenCollectionUuids: string[];
    },
    localState?: {
      currentId: string;
      likedIds: string[];
      dismissedIds: string[];
      history: string[];
      mobileDeckIndex?: number;
      mainTab?: MainTab;
      sideTab?: SideTab;
      nextPanelTab?: NextPanelTab;
    },
    options?: {
      appendCandidates?: boolean;
    }
  ) {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/neta-next-collection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...nextState,
          requestMode: localState?.mainTab ?? mainTab,
        }),
      });
      const payload = (await response.json()) as ApiEnvelope<LiveRecommendationResponse>;
      if (!response.ok) {
        const errorMessage = `recommendation request failed: ${response.status} - ${payload.message || "unknown error"}`;
        throw new Error(errorMessage);
      }
      if (payload.code !== 0 || !payload.data) {
        throw new Error(`recommendation request failed: ${payload.message || "invalid response payload"}`);
      }
      const liveResponse = payload.data;
      setLiveData((prev) => {
        if (!options?.appendCandidates) {
          return {
            current: liveResponse.current,
            normalized: liveResponse.normalized,
            recommendation: liveResponse.recommendation,
          };
        }

        const mergedCandidates = [...prev.normalized.candidate_collections];
        const seenCandidateIds = new Set(mergedCandidates.map((item) => item.uuid));
        for (const candidate of liveResponse.normalized.candidate_collections ?? []) {
          if (!seenCandidateIds.has(candidate.uuid)) {
            mergedCandidates.push(candidate);
            seenCandidateIds.add(candidate.uuid);
          }
        }

        return {
          current: liveResponse.current,
          normalized: {
            ...liveResponse.normalized,
            candidate_collections: mergedCandidates,
            candidate_count: mergedCandidates.length,
          },
          recommendation: liveResponse.recommendation,
        };
      });
      setCurrentId(liveResponse.current.uuid);
      setProfileStore((prev) => {
        const next = new Map(prev);
        next.set(liveResponse.current.uuid, liveResponse.current);
        for (const item of liveResponse.normalized.candidate_collections ?? []) {
          next.set(item.uuid, item);
        }
        return next;
      });
      if (localState) {
        setLikedIds(localState.likedIds);
        setDismissedIds(localState.dismissedIds);
        setHistory(localState.history);
        setCurrentId(localState.currentId);
        setMobileDeckIndex(localState.mobileDeckIndex ?? 0);
        setMainTab(localState.mainTab ?? "next");
        setSideTab(localState.sideTab ?? "summary");
        setNextPanelTab(localState.nextPanelTab ?? "reason");
      }
    } catch (error) {
      console.error("[neta-next-ui] refresh failed", error);
    } finally {
      setIsRefreshing(false);
      setPendingAction(null);
      setPendingCandidateUuid(null);
    }
  }

  useEffect(() => {
    if (!shouldBootstrapRecommendation) {
      return;
    }
    void refreshLiveRecommendation({
      currentCollectionUuid: liveData.current.uuid,
      currentSource: "liked",
      likedCollectionUuids: likedIds,
      dismissedCollectionUuids: dismissedIds,
      seenCollectionUuids: unique([liveData.current.uuid, ...history, ...dismissedIds, ...likedIds]),
    });
  }, [
    dismissedIds,
    history,
    likedIds,
    liveData.current.uuid,
    liveData.normalized.candidate_collections.length,
    liveData.recommendation.recommended_collection_uuid,
    mainTab,
    shouldBootstrapRecommendation,
  ]);

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
    const nextLikedIds = likedIds.includes(id) ? likedIds : [...likedIds, id];
    const nextHistory = [...history, id];
    setPendingAction("like");
    setPendingCandidateUuid(id);
    setSheet(null);
    setDragOffset(0);
    void refreshLiveRecommendation({
      currentCollectionUuid: id,
      likedCollectionUuids: nextLikedIds,
      dismissedCollectionUuids: dismissedIds,
      seenCollectionUuids: unique([currentItem.uuid, ...nextHistory, ...dismissedIds, ...nextLikedIds]),
    }, {
      currentId: id,
      likedIds: nextLikedIds,
      dismissedIds,
      history: nextHistory,
      mobileDeckIndex: 0,
      mainTab: "next",
      sideTab: "session",
      nextPanelTab: "current",
    });
  }

  function handleDismiss(id: string, reason?: string) {
    const nextDismissedIds = dismissedIds.includes(id) ? dismissedIds : [...dismissedIds, id];
    const nextHistory = [...history, id];
    if (reason) {
      setDismissReasonByCandidate((prev) => ({ ...prev, [id]: reason }));
    }
    setDismissTarget(null);
    setPendingAction("dismiss");
    setPendingCandidateUuid(id);
    setDragOffset(0);
    void refreshLiveRecommendation({
      currentCollectionUuid: currentItem.uuid,
      likedCollectionUuids: likedIds,
      dismissedCollectionUuids: nextDismissedIds,
      seenCollectionUuids: unique([currentItem.uuid, ...nextHistory, ...nextDismissedIds, ...likedIds]),
    }, {
      currentId: currentItem.uuid,
      likedIds,
      dismissedIds: nextDismissedIds,
      history: nextHistory,
      mobileDeckIndex: 0,
      mainTab: "next",
      sideTab: sideTab,
      nextPanelTab: "reason",
    });
  }

  function handleNext(id: string) {
    const nextHistory = [...history, id];
    setPendingAction("next");
    setPendingCandidateUuid(id);
    setDragOffset(0);
    void refreshLiveRecommendation({
      currentCollectionUuid: currentItem.uuid,
      likedCollectionUuids: likedIds,
      dismissedCollectionUuids: dismissedIds,
      seenCollectionUuids: unique([currentItem.uuid, ...nextHistory, ...dismissedIds, ...likedIds]),
    }, {
      currentId: currentItem.uuid,
      likedIds,
      dismissedIds,
      history: nextHistory,
      mobileDeckIndex: 0,
      mainTab: "next",
      sideTab,
      nextPanelTab: "reason",
    });
  }

  function resetAll() {
    setPendingAction(null);
    setPendingCandidateUuid(null);
    setFocusedCandidateUuid(null);
    setDismissTarget(null);
    setDismissReasonByCandidate({});
    setCurrentId(liveData.current.uuid);
    setLikedIds([]);
    setDismissedIds([]);
    setHistory([]);
    setMobileDeckIndex(0);
    setMainTab("next");
    setSideTab("summary");
    setNextPanelTab("reason");
    setSheet(null);
    setDragOffset(0);
    void refreshLiveRecommendation({
      currentCollectionUuid: "",
      likedCollectionUuids: [],
      dismissedCollectionUuids: [],
      seenCollectionUuids: [],
    });
  }

  function commitSwipe(direction: "like" | "dismiss") {
    if (!nextEntry) {
      return;
    }
    if (direction === "like") {
      handleLike(nextEntry.candidate.uuid);
      return;
    }
    handleDismiss(nextEntry.candidate.uuid, "swipe-dismiss");
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
      commitSwipe("dismiss");
    } else {
      setDragOffset(0);
    }
    dragStartX.current = null;
  }

  async function fetchFlowFeedPage(pageIndex: number): Promise<FlowFeedResponse> {
    const response = await fetch("/api/neta-community-feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        theme: flowTheme,
        pageIndex,
        pageSize: 12,
      }),
    });
    const payload = (await response.json()) as ApiEnvelope<FlowFeedResponse>;
    if (!response.ok || payload.code !== 0 || !payload.data) {
      throw new Error(payload.message || `community feed request failed: ${response.status}`);
    }
    return payload.data;
  }

  async function loadFlowFeedPage(pageIndex: number, options: FlowPageLoadOptions = {}): Promise<NetaCollectionProfile[]> {
    const { replace = false, append = true } = options;
    setFlowLoading(true);
    try {
      const page = await fetchFlowFeedPage(pageIndex);
      const newItems = page.items;
      setFlowNextPageIndex(page.pageIndex + 1);
      setFlowHasNextPage(page.hasNextPage);
      if (append) {
        setFlowItems((prev) => {
          if (replace) {
            return [...newItems];
          }
          const seen = new Set(prev.filter(Boolean).map((item) => item!.uuid));
          const merged = [...prev];
          for (const item of newItems) {
            if (!seen.has(item.uuid)) {
              merged.push(item);
              seen.add(item.uuid);
            }
          }
          return merged;
        });
        setFlowFocusedUuid((prev) => prev ?? newItems[0]?.uuid ?? null);
      }
      setProfileStore((prev) => {
        const next = new Map(prev);
        for (const item of newItems) {
          next.set(item.uuid, item);
        }
        return next;
      });
      setLikedIds((prev) =>
        unique([
          ...prev,
          ...newItems.filter((item) => item.like_status === "liked").map((item) => item.uuid),
        ])
      );
      return newItems;
    } finally {
      setFlowLoading(false);
    }
  }

  async function ensureFlowDetail(uuid: string): Promise<void> {
    if (!uuid || flowDetailStore.has(uuid)) {
      return;
    }
    const response = await fetch("/api/neta-community-detail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uuid }),
    });
    const payload = (await response.json()) as ApiEnvelope<NetaCollectionProfile>;
    if (!response.ok || payload.code !== 0 || !payload.data) {
      throw new Error(payload.message || `community detail request failed: ${response.status}`);
    }
    setFlowDetailStore((prev) => {
      const next = new Map(prev);
      next.set(uuid, payload.data as NetaCollectionProfile);
      return next;
    });
    setProfileStore((prev) => {
      const next = new Map(prev);
      next.set(uuid, payload.data as NetaCollectionProfile);
      return next;
    });
  }

  async function handleFlowInspect(item: NetaCollectionProfile): Promise<void> {
    setFlowFocusedUuid(item.uuid);
    setSideTab("explain");
    try {
      await ensureFlowDetail(item.uuid);
    } catch (error) {
      console.error("[neta-flow-ui] detail failed", error);
    }
  }

  async function handleLoadMoreFlow(): Promise<void> {
    if (flowLoading || !flowHasNextPage) {
      return;
    }
    try {
      await loadFlowFeedPage(flowNextPageIndex);
    } catch (error) {
      console.error("[neta-flow-ui] load more failed", error);
    }
  }

  async function handleFlowDismiss(item: NetaCollectionProfile, reason?: string): Promise<void> {
    setDismissedIds((prev) => (prev.includes(item.uuid) ? prev : [...prev, item.uuid]));
    setLikedIds((prev) => prev.filter((uuid) => uuid !== item.uuid));
    setHistory((prev) => unique([...prev, item.uuid]));
    setFlowDetailStore((prev) => {
      const next = new Map(prev);
      const currentProfile = next.get(item.uuid) ?? item;
      next.set(item.uuid, { ...currentProfile, like_status: "unliked" });
      return next;
    });
    setProfileStore((prev) => {
      const next = new Map(prev);
      const currentProfile = next.get(item.uuid) ?? item;
      next.set(item.uuid, { ...currentProfile, like_status: "unliked" });
      return next;
    });
    if (reason) {
      setDismissReasonByCandidate((prev) => ({ ...prev, [item.uuid]: reason }));
    }
    setDismissTarget(null);

    const slotIndex = flowItems.findIndex((entry) => entry?.uuid === item.uuid);
    if (slotIndex < 0) {
      return;
    }

    if (flowHasNextPage) {
      try {
        const existingIds = new Set(flowItems.filter(Boolean).map((entry) => entry!.uuid));
        existingIds.delete(item.uuid);
        const nextItems = await loadFlowFeedPage(flowNextPageIndex, { append: false });
        const replacement = nextItems.find((candidate) => !existingIds.has(candidate.uuid) && candidate.uuid !== item.uuid) ?? null;
        setFlowItems((prev) => {
          const next = [...prev];
          next[slotIndex] = replacement;
          return next;
        });
        if (flowFocusedUuid === item.uuid) {
          setFlowFocusedUuid(replacement?.uuid ?? prevFlowFallbackUuid(flowItems, item.uuid));
        }
        return;
      } catch (error) {
        console.error("[neta-flow-ui] dismiss replacement failed", error);
      }
    }

    setFlowItems((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    if (flowFocusedUuid === item.uuid) {
      setFlowFocusedUuid(prevFlowFallbackUuid(flowItems, item.uuid));
    }
  }

  function handleFlowLike(item: NetaCollectionProfile): void {
    const currentlyLiked = likedIds.includes(item.uuid) || item.like_status === "liked";
    setLikedIds((prev) => (currentlyLiked ? prev.filter((uuid) => uuid !== item.uuid) : [...prev, item.uuid]));
    if (!currentlyLiked) {
      setDismissedIds((prev) => prev.filter((uuid) => uuid !== item.uuid));
      setHistory((prev) => unique([...prev, item.uuid]));
    }
    setFlowDetailStore((prev) => {
      const next = new Map(prev);
      const currentProfile = next.get(item.uuid) ?? item;
      next.set(item.uuid, { ...currentProfile, like_status: currentlyLiked ? "unliked" : "liked" });
      return next;
    });
    setProfileStore((prev) => {
      const next = new Map(prev);
      const currentProfile = next.get(item.uuid) ?? item;
      next.set(item.uuid, { ...currentProfile, like_status: currentlyLiked ? "unliked" : "liked" });
      return next;
    });
    setFlowFocusedUuid(item.uuid);
  }

  function handleFlowNext(item: NetaCollectionProfile): void {
    void handleFlowDismiss(item);
  }

  function prevFlowFallbackUuid(itemsList: (NetaCollectionProfile | null)[], removedUuid: string): string | null {
    return itemsList.find((item) => item && item.uuid !== removedUuid)?.uuid ?? null;
  }

  useEffect(() => {
    if (mainTab !== "feed" || flowItems.length > 0 || flowLoading) {
      return;
    }
    void loadFlowFeedPage(0, { replace: true });
  }, [mainTab, flowItems.length, flowLoading]);

  const insightsPanel = (
    <div className="flex h-full min-h-0 flex-col bg-[#08131d]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Insights</div>
          <div className="mt-1 text-[13px] text-slate-300">推荐解释与会话信号</div>
        </div>
        <button
          className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] lg:inline-flex"
          onClick={() => setInsightCollapsed((value) => !value)}
          type="button"
        >
          {insightCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </button>
      </div>

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

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {sideTab === "summary" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-400/18 bg-emerald-400/[0.08] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">
                  {mainTab === "feed" ? "当前选中" : "本轮推荐"}
                </div>
                <div className="mt-2 text-sm font-medium text-white">{mainTab === "feed" ? flowFocusedDetail?.title ?? "暂无" : focusedEntry?.candidate.title ?? "暂无"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">置信度</div>
                <div className="mt-2 text-sm font-medium text-white">{mainTab === "feed" ? "community" : recommendationConfidence}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">候选数</div>
                <div className="mt-2 text-sm font-medium text-white">{mainTab === "feed" ? flowVisibleItems.length : candidateCount}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">主信号</div>
                <div className="mt-2 text-sm font-medium text-white">{mainTab === "feed" ? flowTheme : topSignalText}</div>
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px] leading-6 text-slate-300">
              <div>{mainTab === "feed" ? `当前选中：${flowFocusedDetail?.title ?? "暂无"}` : `推荐结果：${focusedEntry?.candidate.title ?? "暂无"}`}</div>
              <div>主要方向：{mainTab === "feed" ? flowTheme : topSignalText}</div>
              <div>候选来源：{mainTab === "feed" ? "request_community_feed" : recallSourcesLabel}</div>
            </div>
          </div>
        ) : null}

        {sideTab === "session" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">已喜欢</div>
                <div className="mt-2 text-sm font-medium text-white">{likedItems.length}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">不感兴趣</div>
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
            {focusedEntry ? (
              <div className="rounded-[1.2rem] border border-emerald-400/18 bg-emerald-400/[0.08] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">当前查看</div>
                <div className="mt-2 text-sm font-medium text-white">{focusedEntry.candidate.title}</div>
                <p className="mt-2 leading-6 text-slate-200">{focusedEntry.reason}</p>
                {dismissReasonByCandidate[focusedEntry.candidate.uuid] ? (
                  <div className="mt-3 text-[12px] text-slate-300">已标记无感：{dismissReasonByCandidate[focusedEntry.candidate.uuid]}</div>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
              {explanationLines.length ? explanationLines.map((line) => <p key={line}>{line}</p>) : <p>暂无 explanation lines。</p>}
            </div>
            {(liveData.recommendation.fallback_candidates ?? []).slice(0, 3).map((item) => (
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
    </div>
  );

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_22%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_24%),linear-gradient(180deg,#07111a_0%,#09131d_100%)]">
      <div className="flex h-screen w-full flex-col overflow-hidden bg-[#07111a]/92 backdrop-blur-xl">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/8 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/22 bg-emerald-400/10 text-emerald-200">
              <Layers3 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-white">Neta Next Collection</div>
              <div className="truncate text-[11px] text-slate-400">实时推荐工作台</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 lg:flex">
              <SignalChip label={`候选 ${queue.length}`} />
              <SignalChip label={`已喜欢 ${likedItems.length}`} />
              {isRefreshing ? <SignalChip label="刷新中" /> : null}
            </div>
            <Button
              onClick={() => setMobileInsightsOpen(true)}
              size="sm"
              variant="secondary"
              className="border border-white/8 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08] lg:hidden"
            >
              <LayoutPanelLeft className="h-4 w-4" />
              洞察
            </Button>
            <Button onClick={resetAll} size="sm" variant="secondary" className="border border-white/8 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]">
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[168px] shrink-0 border-r border-white/8 bg-[#08131d] lg:block">
            <div className="flex h-full flex-col gap-4 p-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Modes</div>
                <div className="mt-2 text-[12px] leading-5 text-slate-400">左侧切换模式，中间聚焦内容，右侧只放解释。</div>
              </div>
              <div className="grid gap-2">
                <RailButton
                  active={mainTab === "next"}
                  hint="单卡专注决策"
                  icon={<Target className="h-4 w-4" />}
                  label="Next"
                  onClick={() => {
                    setMainTab("next");
                    void refreshLiveRecommendation({
                      currentCollectionUuid: currentItem.uuid,
                      likedCollectionUuids: likedIds,
                      dismissedCollectionUuids: dismissedIds,
                      seenCollectionUuids: unique([currentItem.uuid, ...history, ...dismissedIds, ...likedIds]),
                    }, {
                      currentId: currentItem.uuid,
                      likedIds,
                      dismissedIds,
                      history,
                      mobileDeckIndex,
                      mainTab: "next",
                      sideTab,
                      nextPanelTab,
                    });
                  }}
                />
                <RailButton
                  active={mainTab === "feed"}
                  hint="多列探索流"
                  icon={<Radar className="h-4 w-4" />}
                  label="Flow"
                  onClick={() => {
                    setMainTab("feed");
                    void refreshLiveRecommendation({
                      currentCollectionUuid: currentItem.uuid,
                      likedCollectionUuids: likedIds,
                      dismissedCollectionUuids: dismissedIds,
                      seenCollectionUuids: unique([currentItem.uuid, ...history, ...dismissedIds, ...likedIds]),
                    }, {
                      currentId: currentItem.uuid,
                      likedIds,
                      dismissedIds,
                      history,
                      mobileDeckIndex,
                      mainTab: "feed",
                      sideTab,
                      nextPanelTab,
                    });
                  }}
                />
              </div>
<<<<<<< Updated upstream
              <div className="mt-3 grid gap-2 border-t border-white/8 pt-3">
                <StatTile accent label="当前模式" value={activeFeedMode === "next" ? "Next" : "Flow"} />
                <StatTile label="当前作品" value={currentItem.title} />
                <StatTile label="候选数" value={queue.length} />
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0a1621]">
            <div className="shrink-0 border-b border-white/8 px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-3 lg:hidden">
                <div className="grid grid-cols-2 gap-2">
                  <RailButton
                    active={mainTab === "next"}
                    hint="单卡"
                    icon={<Target className="h-4 w-4" />}
                    label="Next"
                    onClick={() => setMainTab("next")}
                  />
                  <RailButton
                    active={mainTab === "feed"}
                    hint="多列"
                    icon={<Radar className="h-4 w-4" />}
                    label="Flow"
                    onClick={() => setMainTab("feed")}
                  />
                </div>
              </div>
              <div className="mt-0 flex flex-col gap-3 lg:mt-0 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">{mainTab === "next" ? "Next Mode" : "Flow Mode"}</span>
                    {nextEntry ? <span className="rounded-full border border-emerald-400/22 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">{nextEntry.score} pts</span> : null}
                  </div>
                  <div className="mt-2 flex min-w-0 items-center gap-2 overflow-hidden text-[13px] text-slate-300">
                    <span className="min-w-0 truncate">当前作品：{currentItem.title}</span>
                    {nextEntry ? (
                      <>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        <span className="min-w-0 truncate text-white">{mainTab === "next" ? nextEntry.candidate.title : `优先推荐 ${nextEntry.candidate.title}`}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SignalChip label={`主信号 ${topSignalText}`} />
                  <SignalChip label={`置信度 ${recommendationConfidence}`} />
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {mainTab === "next" ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
                  <div className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,0.03))] p-4">
                    <div className="mb-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/70">Next Pick</div>
                        <div className="mt-1 text-[13px] text-slate-400">单图判断当前最值得前进的一条。</div>
                      </div>
                    </div>

                    {nextEntry ? (
                      <div className="space-y-3">
                        {(() => {
                          const isCardPending = isRefreshing && pendingCandidateUuid === nextEntry.candidate.uuid;
                          const pendingLabel =
                            pendingAction === "like"
                              ? "正在喜欢..."
                              : pendingAction === "dismiss"
                                ? "正在标记不感兴趣..."
                                : pendingAction === "next"
                                  ? "正在获取下一条..."
                                  : "加载中...";
                          return (
                            <MinimalVisualCard
                              className="aspect-[4/4.95]"
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
                                <Button
                                  disabled={isRefreshing}
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
                              }
                              footer={
                                <div className="flex items-center justify-between gap-3 text-[12px] text-slate-500">
                                  <span>点击图片打开作品</span>
                                  {isCardPending ? <span className="text-emerald-200">{pendingLabel}</span> : null}
                                </div>
                              }
                            />
                          );
                        })()}
                        <div
                          className="grid grid-cols-3 gap-2"
                          onMouseLeave={() => setDragOffset(0)}
                          onMouseMove={(event) => moveDrag(event.clientX)}
                          onMouseUp={endDrag}
                          onTouchEnd={endDrag}
                          onTouchMove={(event) => moveDrag(event.touches[0]?.clientX ?? 0)}
                        >
                          <Button
                            disabled={isRefreshing}
                            onMouseDown={(event) => beginDrag(event.clientX)}
                            onTouchStart={(event) => beginDrag(event.touches[0]?.clientX ?? 0)}
                            onClick={() => setDismissTarget(nextEntry.candidate)}
                            variant="secondary"
                            className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
                          >
                            <X className="h-4 w-4" />
                            不感兴趣
                          </Button>
                          <Button
                            disabled={isRefreshing}
                            onClick={() => handleNext(nextEntry.candidate.uuid)}
                            variant="secondary"
                            className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
                          >
                            <ArrowRight className="h-4 w-4" />
                            下一个
                          </Button>
                          <Button disabled={isRefreshing} onClick={() => handleLike(nextEntry.candidate.uuid)}>
                            <Heart className="h-4 w-4" />
                            喜欢
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-black/20 p-8 text-center text-sm text-slate-400">
                        当前没有可推荐的下一条作品。
                      </div>
                    )}
                  </div>

                  <div className="grid min-h-0 gap-4 xl:grid-rows-[auto_minmax(0,1fr)]">
                    <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        <Bot className="h-3.5 w-3.5" />
                        Why This One
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <SignalChip label={focusedEntry?.reason ?? "等待推荐结果"} />
                        {focusedEntry
                          ? unique([
                              ...focusedEntry.evidence.conceptOverlap,
                              ...focusedEntry.evidence.intentOverlap,
                              ...focusedEntry.evidence.themeOverlap,
                            ])
                              .slice(0, 3)
                              .map((chip) => <SignalChip key={chip} label={chip} />)
                          : null}
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-col rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/8 bg-black/20 p-1">
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
                      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 text-[13px] text-slate-300">
                        {nextPanelTab === "reason" ? (
                          <div className="space-y-3">
                            {explanationLines.length ? explanationLines.map((line) => <p key={line}>{line}</p>) : <p>暂无 explanation lines。</p>}
                          </div>
                        ) : null}
                        {nextPanelTab === "overlap" && focusedEntry ? (
                          <div className="space-y-3">
                            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">推荐重合点</div>
                              <div className="flex flex-wrap gap-2">
                                {unique([
                                  ...focusedEntry.evidence.conceptOverlap,
                                  ...focusedEntry.evidence.intentOverlap,
                                  ...focusedEntry.evidence.themeOverlap,
                                  ...focusedEntry.evidence.tagOverlap,
                                ])
                                  .slice(0, 8)
                                  .map((chip) => <SignalChip key={chip} label={chip} />)}
                              </div>
                            </div>
                            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4 leading-6">
                              <div>社区延续：{focusedEntry.evidence.communityOverlap.join(" / ") || "暂无"}</div>
                              <div>候选来源：{(focusedEntry.candidate.source_feed_item?.recall_sources ?? []).join(" / ") || "暂无"}</div>
                              <div>CTA：{focusedEntry.candidate.cta_info?.brief_input ?? "暂无"}</div>
                            </div>
                          </div>
                        ) : null}
                        {nextPanelTab === "current" ? (
                          <div className="space-y-3">
                            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">当前作品</div>
                              <div className="mt-2 text-sm font-medium text-white">{currentItem.title}</div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {unique([...(currentItem.concept_labels ?? []), ...(currentItem.intent_labels ?? []), ...(currentItem.theme_labels ?? [])])
                                  .slice(0, 8)
                                  .map((chip) => <SignalChip key={chip} label={chip} />)}
                              </div>
                            </div>
                            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4 leading-6">
                              <div>CTA：{currentItem.cta_info?.brief_input ?? "暂无"}</div>
                              <div>内容标签：{(currentItem.content_tags ?? []).slice(0, 4).join(" / ") || "暂无"}</div>
                              <div>社区标签：{(currentItem.community_tags ?? []).slice(0, 4).join(" / ") || "暂无"}</div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile accent label="当前选中" value={flowFocusedDetail?.title ?? "暂无"} />
                    <StatTile label="Feed 主题" value={flowTheme} />
                    <StatTile label="已加载" value={flowVisibleItems.length} />
                    <StatTile label="更多页" value={flowHasNextPage ? "可继续加载" : "已到底"} />
                  </div>
                  <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {flowItems.length ? (
                      flowItems.map((item, index) =>
                        item ? (
                          <CollectionCard
                            key={item.uuid}
                            active={flowFocusedUuid === item.uuid}
                            liked={likedIds.includes(item.uuid) || item.like_status === "liked"}
                            disliked={dismissedIds.includes(item.uuid)}
                            entry={{
                              candidate: item,
                              score: 0,
                              reason: item.description || item.cta_info?.brief_input || "点击卡片查看详情",
                              evidence: {
                                conceptOverlap: [],
                                intentOverlap: [],
                                themeOverlap: [],
                                tagOverlap: [],
                                formatOverlap: [],
                                interactionOverlap: [],
                                communityOverlap: [],
                              },
                            }}
                            label={index === 0 ? "Top Pick" : `候选 ${index + 1}`}
                            onInspect={() => {
                              void handleFlowInspect(item);
                            }}
                            onLike={() => handleFlowLike(item)}
                            onDismiss={() => setDismissTarget(item)}
                            onNext={() => handleFlowNext(item)}
                          />
                        ) : (
                          <div
                            key={`empty-slot-${index}`}
                            className="flex min-h-[320px] items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-black/20 text-sm text-slate-500"
                          >
                            已略过
                          </div>
                        )
                      )
                    ) : (
                      <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-black/20 p-8 text-center text-sm text-slate-400 sm:col-span-2 xl:col-span-4">
                        当前没有可展示的推荐流。
                      </div>
                    )}
                  </div>
                  {flowItems.length > 0 ? (
                    <div className="flex justify-center pt-1">
                      <Button
                        disabled={flowLoading || !flowHasNextPage}
                        onClick={() => void handleLoadMoreFlow()}
                        size="sm"
                        variant="secondary"
                        className="border border-white/8 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
                      >
                        {flowLoading ? "加载中..." : flowHasNextPage ? "加载下一页" : "没有更多了"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <aside
            className={`hidden shrink-0 border-l border-white/8 bg-[#08131d] lg:block ${
              insightCollapsed ? "w-[64px]" : "w-[272px]"
            }`}
          >
            {insightCollapsed ? (
              <div className="flex h-full flex-col items-center gap-3 py-4">
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
              insightsPanel
            )}
          </aside>
        </div>

        {dismissTarget ? (
          <>
            <button
              aria-label="Close dismiss reason"
              className="fixed inset-0 z-40 bg-[#02070b]/68 backdrop-blur-sm"
              onClick={() => setDismissTarget(null)}
              type="button"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-[1.5rem] border border-white/10 bg-[#09141e] p-5 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/42">无感理由</div>
                    <h2 className="mt-2 text-xl font-semibold text-white">为什么不想继续看这条？</h2>
                    <p className="mt-2 text-sm leading-6 text-white/70">{dismissTarget.title}</p>
                  </div>
                  <Button
                    onClick={() => setDismissTarget(null)}
                    size="sm"
                    variant="secondary"
                    className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.1]"
                  >
                    关闭
                  </Button>
                </div>
                <div className="mt-5 grid gap-2">
                  {DISMISS_REASON_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
                      onClick={() =>
                        mainTab === "feed"
                          ? void handleFlowDismiss(dismissTarget, option.label)
                          : handleDismiss(dismissTarget.uuid, option.label)
                      }
                      type="button"
                    >
                      <div className="text-sm font-medium text-white">{option.label}</div>
                      <div className="mt-1 text-[12px] leading-5 text-slate-400">{option.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {mobileInsightsOpen ? (
          <>
            <button className="fixed inset-0 z-40 bg-[#02070b]/72 backdrop-blur-sm lg:hidden" onClick={() => setMobileInsightsOpen(false)} type="button" />
            <div className="fixed inset-x-0 bottom-0 z-50 h-[78vh] rounded-t-[1.8rem] border-t border-white/10 bg-[#08131d] shadow-2xl lg:hidden">
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                  <div className="h-1.5 w-14 rounded-full bg-white/10" />
                  <Button
                    onClick={() => setMobileInsightsOpen(false)}
                    size="sm"
                    variant="secondary"
                    className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
                  >
                    关闭
                  </Button>
                </div>
                {insightsPanel}
              </div>
            </div>
          </>
        ) : null}

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
