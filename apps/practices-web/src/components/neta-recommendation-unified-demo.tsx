"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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

type LikeMutationResponse = {
  success: boolean;
  message: string;
  uuid: string;
  isCancel: boolean;
};

type FlowPageLoadOptions = {
  replace?: boolean;
  append?: boolean;
};

type UnifiedSequenceItem = {
  id: string;
  item: NetaCollectionProfile;
  source: "recommended" | "feed";
  reason?: string;
  queueEntry?: QueueEntry | null;
};

type InteractionTrace = {
  id: string;
  action: "refresh" | "like" | "unlike" | "dismiss";
  sourceTitle: string;
  targetTitle?: string;
  slotIndex: number;
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

function isSameUnifiedSequence(left: UnifiedSequenceItem[], right: UnifiedSequenceItem[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const current = left[index];
    const next = right[index];
    if (
      current.id !== next.id ||
      current.source !== next.source ||
      current.reason !== next.reason ||
      current.item.uuid !== next.item.uuid ||
      current.item.title !== next.item.title ||
      current.item.cover_url !== next.item.cover_url ||
      current.item.like_status !== next.item.like_status ||
      current.item.cta_info?.brief_input !== next.item.cta_info?.brief_input ||
      current.item.description !== next.item.description
    ) {
      return false;
    }
  }
  return true;
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

export function NetaRecommendationUnifiedDemo({ current, normalized, recommendation }: DemoProps) {
  const router = useRouter();
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
  const [unifiedIndex, setUnifiedIndex] = useState(0);
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
  const [flowDetailStore, setFlowDetailStore] = useState<Map<string, NetaCollectionProfile>>(new Map());
  const [streamItems, setStreamItems] = useState<UnifiedSequenceItem[]>([]);
  const [interactionTrace, setInteractionTrace] = useState<InteractionTrace[]>([]);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const wheelLockRef = useRef(false);
  const flowDetailInFlightRef = useRef<Set<string>>(new Set());
  const flowDetailFailedRef = useRef<Set<string>>(new Set());

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
  const fallbackEntries = useMemo(() => {
    const fallbackIds = new Set((liveData.recommendation.fallback_candidates ?? []).map((entry) => entry.uuid));
    const byUuid = new Map(queue.map((entry) => [entry.candidate.uuid, entry]));
    const orderedFromRecommendation = (liveData.recommendation.fallback_candidates ?? [])
      .map((entry) => byUuid.get(entry.uuid))
      .filter((entry): entry is QueueEntry => Boolean(entry));
    const remaining = queue.filter((entry) => !fallbackIds.has(entry.candidate.uuid));
    return [...orderedFromRecommendation, ...remaining].slice(0, 3);
  }, [liveData.recommendation.fallback_candidates, queue]);
  const flowVisibleItems = flowItems.filter((item): item is NetaCollectionProfile => Boolean(item));
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
  const shouldBootstrapRecommendation =
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
      sideTab?: SideTab;
      nextPanelTab?: NextPanelTab;
    },
    options?: {
      appendCandidates?: boolean;
      preserveUnifiedIndex?: boolean;
    }
  ): Promise<LiveRecommendationResponse | null> {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/neta-next-collection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextState),
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
        if (!options?.preserveUnifiedIndex) {
          setUnifiedIndex(0);
        }
        setSideTab(localState.sideTab ?? "summary");
        setNextPanelTab(localState.nextPanelTab ?? "reason");
      }
      return liveResponse;
    } catch (error) {
      console.error("[neta-next-ui] refresh failed", error);
      return null;
    } finally {
      setIsRefreshing(false);
      setPendingAction(null);
      setPendingCandidateUuid(null);
    }
  }

  async function syncCollectionLike(uuid: string, isCancel = false): Promise<boolean> {
    const response = await fetch("/api/neta-community-like", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uuid,
        isCancel,
      }),
    });
    const payload = (await response.json()) as ApiEnvelope<LikeMutationResponse>;
    if (!response.ok || payload.code !== 0 || !payload.data?.success) {
      throw new Error(payload.message || `community like request failed: ${response.status}`);
    }
    return true;
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

  async function handleLike(id: string) {
    const isCancel = likedIds.includes(id) || getProfileById(id)?.like_status === "liked";
    const nextLikedIds = isCancel ? likedIds.filter((likedId) => likedId !== id) : likedIds.includes(id) ? likedIds : [...likedIds, id];
    const nextHistory = [...history, id];
    const sourceTitle = displayedUnifiedItem?.title ?? getProfileById(id)?.title ?? id;
    const anchorIndex = safeUnifiedIndex;
    const baseSequence = unifiedSequence;
    setPendingAction("like");
    setPendingCandidateUuid(id);
    setSheet(null);
    setDragOffset(0);
    try {
      await syncCollectionLike(id, isCancel);
      setLikedIds(nextLikedIds);
      setProfileStore((prev) => {
        const next = new Map(prev);
        const currentProfile = next.get(id) ?? getProfileById(id);
        if (currentProfile) {
          next.set(id, {
            ...currentProfile,
            like_status: isCancel ? "unliked" : "liked",
            like_count: typeof currentProfile.like_count === "number" ? Math.max(currentProfile.like_count + (isCancel ? -1 : 1), 0) : isCancel ? 0 : 1,
          });
        }
        return next;
      });
      setStreamItems((prev) =>
        prev.map((entry) =>
          entry.item.uuid === id
            ? {
                ...entry,
                item: {
                  ...entry.item,
                  like_status: isCancel ? "unliked" : "liked",
                  like_count: typeof entry.item.like_count === "number" ? Math.max(entry.item.like_count + (isCancel ? -1 : 1), 0) : isCancel ? 0 : 1,
                },
              }
            : entry
        )
      );
      setFlowDetailStore((prev) => {
        const next = new Map(prev);
        const currentProfile = next.get(id);
        if (currentProfile) {
          next.set(id, {
            ...currentProfile,
            like_status: isCancel ? "unliked" : "liked",
            like_count: typeof currentProfile.like_count === "number" ? Math.max(currentProfile.like_count + (isCancel ? -1 : 1), 0) : isCancel ? 0 : 1,
          });
        }
        return next;
      });
    } catch (error) {
      console.error("[neta-flow-ui] like failed", error);
      setPendingAction(null);
      setPendingCandidateUuid(null);
      return;
    }

    return refreshLiveRecommendation({
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
      sideTab: "session",
      nextPanelTab: "current",
    }, {
      preserveUnifiedIndex: true,
    }).then((response) => {
      if (!response) {
        return;
      }
      const recommendedEntries = buildRecommendedSequenceFromResponse(response);
      setStreamItems((prev) => spliceRecommendedEntries(prev.length ? prev : baseSequence, recommendedEntries, anchorIndex));
      setInteractionTrace((prev) => [
        {
          id: `trace_like_${Date.now()}_${id}`,
          action: isCancel ? "unlike" : "like",
          sourceTitle,
          targetTitle: recommendedEntries[0]?.item.title,
          slotIndex: anchorIndex,
        },
        ...prev,
      ]);
    });
  }

  function handleDismiss(id: string, reason?: string) {
    const nextDismissedIds = dismissedIds.includes(id) ? dismissedIds : [...dismissedIds, id];
    const nextHistory = [...history, id];
    const sourceTitle = displayedUnifiedItem?.title ?? getProfileById(id)?.title ?? id;
    const anchorIndex = safeUnifiedIndex;
    const baseSequence = unifiedSequence;
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
      sideTab: sideTab,
      nextPanelTab: "reason",
    }, {
      preserveUnifiedIndex: true,
    }).then((response) => {
      if (!response) {
        return;
      }
      const recommendedEntries = buildRecommendedSequenceFromResponse(response);
      setStreamItems((prev) => spliceRecommendedEntries(prev.length ? prev : baseSequence, recommendedEntries, anchorIndex));
      setInteractionTrace((prev) => [
        {
          id: `trace_dismiss_${Date.now()}_${id}`,
          action: "dismiss",
          sourceTitle,
          targetTitle: recommendedEntries[0]?.item.title,
          slotIndex: anchorIndex,
        },
        ...prev,
      ]);
    });
  }

  function buildRecommendedSequenceFromResponse(response: LiveRecommendationResponse): UnifiedSequenceItem[] {
    const byId = new Map<string, NetaCollectionProfile>();
    byId.set(response.current.uuid, response.current);
    for (const item of response.normalized.candidate_collections ?? []) {
      byId.set(item.uuid, item);
    }
    const result: UnifiedSequenceItem[] = [];
    const seen = new Set<string>();
    const pushItem = (uuid: string | undefined, reason?: string) => {
      if (!uuid || seen.has(uuid)) {
        return;
      }
      const item = byId.get(uuid);
      if (!item) {
        return;
      }
      seen.add(uuid);
      result.push({
        id: `recommended:${uuid}`,
        item,
        source: "recommended",
        reason,
      });
    };

    pushItem(response.recommendation.recommended_collection_uuid, response.recommendation.recommendation_reason);
    for (const fallback of response.recommendation.fallback_candidates ?? []) {
      pushItem(fallback.uuid, fallback.reason_lines?.join(" ") || fallback.title);
    }
    return result;
  }

  function spliceRecommendedEntries(
    baseSequence: UnifiedSequenceItem[],
    recommendedEntries: UnifiedSequenceItem[],
    anchorIndex: number,
    options?: { replaceCurrent?: boolean }
  ): UnifiedSequenceItem[] {
    if (!recommendedEntries.length) {
      return baseSequence;
    }
    const recommendedIds = new Set(recommendedEntries.map((entry) => entry.item.uuid));
    const next = baseSequence.filter(
      (entry, index) => (!options?.replaceCurrent || index !== anchorIndex) && !recommendedIds.has(entry.item.uuid)
    );
    const insertAt = Math.min(options?.replaceCurrent ? anchorIndex : anchorIndex + 1, next.length);
    next.splice(insertAt, 0, ...recommendedEntries.slice(0, 4));
    return next;
  }

  async function handleNext(id: string) {
    const nextHistory = [...history, id];
    const sourceTitle = displayedUnifiedItem?.title ?? getProfileById(id)?.title ?? id;
    setPendingAction("next");
    setPendingCandidateUuid(id);
    setDragOffset(0);
    const response = await refreshLiveRecommendation({
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
      sideTab,
      nextPanelTab: "reason",
    }, {
      preserveUnifiedIndex: true,
    });

    if (!response) {
      return;
    }

    const refreshedEntries = buildRecommendedSequenceFromResponse(response);
    const replacement = refreshedEntries[0] ?? null;
    const insertions = refreshedEntries.slice(1, 4);

    if (replacement) {
      setStreamItems((prev) => {
        const base = prev.length ? prev : unifiedSequence;
        return spliceRecommendedEntries(base, [replacement, ...insertions], safeUnifiedIndex, { replaceCurrent: true });
      });
      setInteractionTrace((prev) => [
        {
          id: `trace_refresh_${Date.now()}_${replacement.item.uuid}`,
          action: "refresh",
          sourceTitle,
          targetTitle: replacement.item.title,
          slotIndex: safeUnifiedIndex,
        },
        ...prev,
      ]);
    }
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
    setUnifiedIndex(0);
    setStreamItems([]);
    setInteractionTrace([]);
    flowDetailInFlightRef.current.clear();
    flowDetailFailedRef.current.clear();
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
    if (!displayedUnifiedItem) {
      return;
    }
    if (direction === "like") {
      handleLike(displayedUnifiedItem.uuid);
      return;
    }
    handleDismiss(displayedUnifiedItem.uuid, "swipe-dismiss");
  }

  function beginDrag(clientX: number) {
    dragStartX.current = clientX;
  }

  function beginUnifiedDrag(clientX: number, clientY: number) {
    dragStartX.current = clientX;
    dragStartY.current = clientY;
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

  function clearUnifiedDrag() {
    dragStartX.current = null;
    dragStartY.current = null;
    setDragOffset(0);
  }

  function handleUnifiedWheel(deltaY: number) {
    if (wheelLockRef.current || Math.abs(deltaY) < 12) {
      return;
    }
    wheelLockRef.current = true;
    void navigateUnified(deltaY > 0 ? "next" : "prev");
    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 260);
  }

  function endUnifiedDrag(clientX: number, clientY: number) {
    if (dragStartX.current === null || dragStartY.current === null || !displayedUnifiedItem) {
      clearUnifiedDrag();
      return;
    }

    const deltaX = clientX - dragStartX.current;
    const deltaY = clientY - dragStartY.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absY > absX && absY > 60) {
      void navigateUnified(deltaY > 0 ? "prev" : "next");
      clearUnifiedDrag();
      return;
    }

    if (absX > 60) {
      if (deltaX > 0) {
        handleLike(displayedUnifiedItem.uuid);
      } else {
        handleDismiss(displayedUnifiedItem.uuid, "swipe-dismiss");
      }
    }

    clearUnifiedDrag();
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
    if (!uuid || flowDetailStore.has(uuid) || flowDetailInFlightRef.current.has(uuid) || flowDetailFailedRef.current.has(uuid)) {
      return;
    }
    flowDetailInFlightRef.current.add(uuid);
    try {
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
      flowDetailFailedRef.current.delete(uuid);
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
    } catch (error) {
      flowDetailFailedRef.current.add(uuid);
      console.error("[neta-flow-ui] detail failed", error);
    } finally {
      flowDetailInFlightRef.current.delete(uuid);
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

  useEffect(() => {
    if (flowItems.length > 0 || flowLoading) {
      return;
    }
    void loadFlowFeedPage(0, { replace: true });
  }, [flowItems.length, flowLoading]);

  const sourceUnifiedSequence = useMemo<UnifiedSequenceItem[]>(() => {
    const list: UnifiedSequenceItem[] = [];
    const seen = new Set<string>();

    const pushItem = (entry: UnifiedSequenceItem | null) => {
      if (!entry || seen.has(entry.item.uuid)) {
        return;
      }
      seen.add(entry.item.uuid);
      list.push(entry);
    };

    pushItem(
      nextEntry
        ? {
            id: `recommended:${nextEntry.candidate.uuid}`,
            item: nextEntry.candidate,
            source: "recommended",
            reason: nextEntry.reason,
            queueEntry: nextEntry,
          }
        : null
    );

    for (const entry of fallbackEntries) {
      pushItem({
        id: `recommended:${entry.candidate.uuid}`,
        item: entry.candidate,
        source: "recommended",
        reason: entry.reason,
        queueEntry: entry,
      });
    }

    for (const item of flowVisibleItems) {
      const hydrated = flowDetailStore.get(item.uuid) ?? item;
      pushItem({
        id: `feed:${hydrated.uuid}`,
        item: hydrated,
        source: "feed",
        reason: hydrated.cta_info?.brief_input ?? hydrated.description ?? "",
        queueEntry: queue.find((entry) => entry.candidate.uuid === hydrated.uuid) ?? null,
      });
    }

    if (!list.length) {
      pushItem({
        id: `current:${currentItem.uuid}`,
        item: currentItem,
        source: "recommended",
        reason: liveData.recommendation.recommendation_reason ?? currentItem.cta_info?.brief_input ?? currentItem.description ?? "",
        queueEntry: queue.find((entry) => entry.candidate.uuid === currentItem.uuid) ?? null,
      });
    }

    return list;
  }, [
    currentItem,
    fallbackEntries,
    flowDetailStore,
    flowVisibleItems,
    liveData.recommendation.recommendation_reason,
    nextEntry,
    queue,
  ]);

  useEffect(() => {
    if (!sourceUnifiedSequence.length) {
      return;
    }
    setStreamItems((prev) => {
      if (!prev.length) {
        return isSameUnifiedSequence(prev, sourceUnifiedSequence) ? prev : sourceUnifiedSequence;
      }
      const next = prev.map((entry) => {
        const refreshed = sourceUnifiedSequence.find((candidate) => candidate.item.uuid === entry.item.uuid);
        return refreshed
          ? {
              ...entry,
              item: refreshed.item,
              reason: refreshed.reason ?? entry.reason,
              queueEntry: refreshed.queueEntry ?? entry.queueEntry,
            }
          : entry;
      });
      const seen = new Set(next.map((entry) => entry.item.uuid));
      for (const entry of sourceUnifiedSequence) {
        if (entry.source === "feed" && !seen.has(entry.item.uuid)) {
          next.push(entry);
          seen.add(entry.item.uuid);
        }
      }
      return isSameUnifiedSequence(prev, next) ? prev : next;
    });
  }, [sourceUnifiedSequence]);

  const unifiedSequence = streamItems.length ? streamItems : sourceUnifiedSequence;
  const safeUnifiedIndex = Math.min(unifiedIndex, Math.max(unifiedSequence.length - 1, 0));
  const displayedUnified = unifiedSequence[safeUnifiedIndex] ?? null;
  const displayedUnifiedItem = displayedUnified?.item ?? null;
  function resolveQueueEntry(entry: UnifiedSequenceItem | null): QueueEntry | null {
    if (!entry) {
      return null;
    }
    return entry.queueEntry ?? queue.find((candidate) => candidate.candidate.uuid === entry.item.uuid) ?? null;
  }

  function getUnifiedReason(entry: UnifiedSequenceItem | null): string {
    const queueEntry = resolveQueueEntry(entry);
    return entry?.reason ?? queueEntry?.reason ?? entry?.item.cta_info?.brief_input ?? entry?.item.description ?? "上下切换内容，左右表达偏好。";
  }

  function getUnifiedChips(entry: UnifiedSequenceItem | null): string[] {
    const queueEntry = resolveQueueEntry(entry);
    if (entry?.source === "feed") {
      return unique([
        ...(entry.item.concept_labels ?? []),
        ...(entry.item.intent_labels ?? []),
        ...(entry.item.theme_labels ?? []),
        ...(entry.item.content_tags ?? []),
      ]).slice(0, 6);
    }
    return unique([
      ...(queueEntry?.evidence.conceptOverlap ?? []),
      ...(queueEntry?.evidence.intentOverlap ?? []),
      ...(queueEntry?.evidence.themeOverlap ?? []),
      ...(queueEntry?.evidence.tagOverlap ?? []),
      ...(entry?.item.concept_labels ?? []),
    ]).slice(0, 6);
  }

  const displayedQueueEntry = resolveQueueEntry(displayedUnified);
  const unifiedPending = Boolean(displayedUnifiedItem && isRefreshing && pendingCandidateUuid === displayedUnifiedItem.uuid);
  const displayedUnifiedLiked = Boolean(
    displayedUnifiedItem && (likedIds.includes(displayedUnifiedItem.uuid) || displayedUnifiedItem.like_status === "liked")
  );
  const unifiedReason = getUnifiedReason(displayedUnified);
  const unifiedChips = getUnifiedChips(displayedUnified);
  const latestTrace = interactionTrace[0] ?? null;
  const mobilePanelState = isRefreshing
    ? {
        tone: "busy" as const,
        ringClass: "border-amber-300/24 bg-amber-300/12 text-amber-100 hover:bg-amber-300/18",
        dotClass: "bg-amber-300",
      }
    : latestTrace?.targetTitle
      ? {
          tone: "ready" as const,
          ringClass: "border-emerald-300/24 bg-emerald-300/12 text-emerald-100 hover:bg-emerald-300/18",
          dotClass: "bg-emerald-300",
        }
      : {
          tone: "idle" as const,
          ringClass: "border-white/10 bg-[#0b1722]/92 text-slate-100 hover:bg-[#102131]",
          dotClass: "bg-slate-500",
        };

  async function navigateUnified(direction: "prev" | "next"): Promise<void> {
    if (!unifiedSequence.length) {
      return;
    }

    if (direction === "prev") {
      setUnifiedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    const nextIndex = safeUnifiedIndex + 1;
    const remaining = unifiedSequence.length - nextIndex;
    if (remaining <= 2 && flowHasNextPage && !flowLoading) {
      void handleLoadMoreFlow();
    }
    if (nextIndex < unifiedSequence.length) {
      setUnifiedIndex(nextIndex);
      return;
    }
    if (flowHasNextPage && !flowLoading) {
      await handleLoadMoreFlow();
      setUnifiedIndex((prev) => Math.min(prev + 1, Math.max(unifiedSequence.length, 0)));
    }
  }

  useEffect(() => {
    if (!displayedUnifiedItem) {
      return;
    }
    if (
      displayedUnified.source === "feed" &&
      !flowDetailStore.has(displayedUnifiedItem.uuid) &&
      !flowDetailInFlightRef.current.has(displayedUnifiedItem.uuid) &&
      !flowDetailFailedRef.current.has(displayedUnifiedItem.uuid)
    ) {
      void ensureFlowDetail(displayedUnifiedItem.uuid);
    }
  }, [displayedUnified, displayedUnifiedItem, flowDetailStore]);

  const insightsPanel = (
    <div className="flex h-full min-h-0 flex-col rounded-[1.75rem] border border-white/8 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Panel</div>
          <div className="mt-1 text-sm font-medium text-white">详情</div>
        </div>
        {dismissedIds.length > 0 || likedItems.length > 0 ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[11px] text-white/62">
            <span>{likedItems.length} 喜欢</span>
            <span>{dismissedIds.length} 略过</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-1 border-b border-white/8 p-3">
        {[
          { id: "summary", label: "详情" },
          { id: "session", label: "偏好" },
          { id: "explain", label: "推荐" },
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
            <div className="rounded-[1.2rem] border border-emerald-400/18 bg-emerald-400/[0.08] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">当前卡片</div>
              <div className="mt-2 text-sm font-medium text-white">{displayedUnifiedItem?.title ?? "暂无"}</div>
              <p className="mt-2 text-[13px] leading-6 text-slate-200">{unifiedReason}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatTile accent label="已喜欢" value={likedItems.length} />
              <StatTile label="已略过" value={dismissedIds.length} />
              <StatTile label="内容序列" value={unifiedSequence.length} />
              <StatTile label="更多推荐" value={candidateCount} />
            </div>
            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4 text-[13px] leading-6 text-slate-300">
              <div>玩法：{displayedUnifiedItem?.cta_info?.brief_input ?? "暂无"}</div>
              <div>当前状态：{likedIds.includes(displayedUnifiedItem?.uuid ?? "") || displayedUnifiedItem?.like_status === "liked" ? "已喜欢" : "未喜欢"}</div>
              <div>说明：{displayedUnifiedItem?.description ?? "暂无"}</div>
            </div>
          </div>
        ) : null}

        {sideTab === "session" ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">偏好标签</div>
              <div className="flex flex-wrap gap-2">
                {signals.length ? (
                  signals.map((signal) => (
                    <SignalChip key={`${signal.bucket}:${signal.key}`} label={`${signal.bucket} · ${signal.key} ×${signal.value}`} />
                  ))
                ) : (
                  <p className="text-[13px] text-slate-400">还没有足够信号，先上下刷几条再做左右决策。</p>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">会话轨迹</div>
              <div className="flex flex-wrap gap-2">
                {interactionTrace.length ? (
                  interactionTrace.map((entry) => (
                    <SignalChip
                      key={entry.id}
                      label={
                        entry.action === "refresh"
                          ? `刷新 · ${entry.sourceTitle} -> ${entry.targetTitle ?? "新内容"}`
                          : entry.action === "unlike"
                            ? `取消喜欢 · ${entry.sourceTitle}`
                          : entry.action === "like"
                            ? `喜欢 · ${entry.sourceTitle}`
                            : `无感 · ${entry.sourceTitle}`
                      }
                    />
                  ))
                ) : sessionTrail.length ? (
                  sessionTrail.map((item) => <SignalChip key={item.uuid} label={item.title} />)
                ) : (
                  <p className="text-[13px] text-slate-400">还没有会话轨迹。</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {sideTab === "explain" ? (
          <div className="space-y-3 text-[13px] text-slate-300">
            <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">推荐理由</div>
              <div className="flex flex-wrap gap-2">
                {unifiedChips.length ? unifiedChips.map((chip) => <SignalChip key={chip} label={chip} />) : <p>暂无核心重合点。</p>}
              </div>
            </div>
            <div className="space-y-2 rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
              {explanationLines.length ? explanationLines.map((line) => <p key={line}>{line}</p>) : <p>{unifiedReason}</p>}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#08131d]/82 shadow-[0_24px_80px_rgba(8,19,29,0.28)]">
          <div className="border-b border-white/8 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => router.back()}
                  size="sm"
                  variant="secondary"
                  className="border border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
                  aria-label="返回"
                  title="返回"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={resetAll}
                  size="sm"
                  variant="secondary"
                  className="border border-white/10 bg-white/8 text-white hover:bg-white/12"
                  aria-label="重置"
                  title="重置"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 gap-5 p-5 sm:p-6 lg:min-h-[calc(100vh-13rem)] lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-3">
              {displayedUnifiedItem ? (
                <div
                  className="w-full touch-pan-y cursor-grab active:cursor-grabbing"
                  onPointerDown={(event) => {
                    if (event.pointerType === "mouse" || event.pointerType === "pen") {
                      beginUnifiedDrag(event.clientX, event.clientY);
                    }
                  }}
                  onPointerUp={(event) => {
                    if (event.pointerType === "mouse" || event.pointerType === "pen") {
                      endUnifiedDrag(event.clientX, event.clientY);
                    }
                  }}
                  onPointerCancel={() => {
                    clearUnifiedDrag();
                  }}
                  onTouchEnd={(event) => {
                    const touch = event.changedTouches[0];
                    if (!touch) {
                      clearUnifiedDrag();
                      return;
                    }
                    endUnifiedDrag(touch.clientX, touch.clientY);
                  }}
                  onTouchStart={(event) => {
                    const touch = event.touches[0];
                    if (!touch) {
                      return;
                    }
                    beginUnifiedDrag(touch.clientX, touch.clientY);
                  }}
                  onWheel={(event) => {
                    event.preventDefault();
                    handleUnifiedWheel(event.deltaY);
                  }}
                >
                  <div className="relative h-[min(72vh,640px)] overflow-hidden rounded-[1.25rem]">
                    <div
                      className="flex h-full flex-col transition-transform duration-300 ease-out will-change-transform"
                      style={{ transform: `translateY(-${safeUnifiedIndex * 100}%)` }}
                    >
                      {unifiedSequence.map((entry, index) => {
                        const entryReason = getUnifiedReason(entry);
                        const entryChips = getUnifiedChips(entry);
                        const entryPending = Boolean(isRefreshing && pendingCandidateUuid === entry.item.uuid);
                        return (
                          <div key={entry.id} className="flex h-[min(72vh,640px)] shrink-0 flex-col">
                            <MinimalVisualCard
                              className="flex-1"
                              accent={entry.source === "recommended"}
                              eyebrow={entry.source === "recommended" ? "为你推荐" : "继续浏览"}
                              chips={entryChips}
                              item={entry.item}
                              title={entry.item.title}
                              footer={
                                <div className="space-y-2">
                                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 text-[12px] leading-5 text-slate-300">
                                    <span className="text-slate-500">玩法</span>
                                    <span className="min-w-0 line-clamp-2 break-words">
                                      {entry.item.cta_info?.brief_input ?? entry.item.cta_info?.preset_description ?? "暂无 CTA"}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-[12px] text-slate-500">
                                    <span className="shrink-0">{`${index + 1}/${unifiedSequence.length || 1}`}</span>
                                    <span className="min-w-0 truncate">{entryReason}</span>
                                    <span className={`shrink-0 ${entryPending ? "text-emerald-200" : "text-transparent"}`}>
                                      {entryPending ? "处理中..." : "占位"}
                                    </span>
                                  </div>
                                </div>
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                    {isRefreshing ? (
                      <div className="pointer-events-none absolute inset-x-4 bottom-3 z-20">
                        <div className="h-1 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full w-1/3 animate-pulse rounded-full bg-emerald-300" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-[1.35rem] border border-white/8 bg-[#0b1722]/92 p-3 shadow-[0_-8px_32px_rgba(2,6,10,0.18)]">
                    <div className="grid w-full grid-cols-3 items-center gap-3">
                      <Button
                        disabled={!displayedUnifiedItem}
                        onClick={() => {
                          if (!displayedUnifiedItem) {
                            return;
                          }
                          setDismissTarget(displayedUnifiedItem);
                        }}
                        variant="secondary"
                        className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        disabled={!displayedUnifiedItem || isRefreshing}
                        onClick={() => {
                          if (!displayedUnifiedItem) {
                            return;
                          }
                          handleNext(displayedUnifiedItem.uuid);
                        }}
                        variant="secondary"
                        className="border border-white/8 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
                        aria-label="刷新"
                        title="刷新"
                      >
                        <RotateCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        disabled={!displayedUnifiedItem}
                        onClick={() => {
                          if (!displayedUnifiedItem) {
                            return;
                          }
                          handleLike(displayedUnifiedItem.uuid);
                        }}
                        aria-label={displayedUnifiedLiked ? "取消点赞" : "喜欢"}
                        title={displayedUnifiedLiked ? "取消点赞" : "喜欢"}
                        className={displayedUnifiedLiked ? "bg-rose-500 text-white hover:bg-rose-500/90" : ""}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full rounded-[1.5rem] border border-dashed border-white/12 bg-black/20 p-10 text-center text-sm text-slate-400">
                  当前没有可展示的卡片。
                </div>
              )}
            </div>

            <aside className="hidden min-h-0 lg:block">{insightsPanel}</aside>
          </div>
        </section>

        {mobileInsightsOpen ? (
          <>
            <button className="fixed inset-0 z-40 bg-[#02070b]/72 backdrop-blur-sm lg:hidden" onClick={() => setMobileInsightsOpen(false)} type="button" />
            <div className="fixed inset-y-0 right-0 z-50 w-[88vw] max-w-[380px] border-l border-white/10 bg-[#08131d] shadow-2xl lg:hidden">
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Panel</div>
                    <div className="mt-1 text-sm font-medium text-white">详情</div>
                  </div>
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

        {!mobileInsightsOpen ? (
          <button
            aria-label="打开详情"
            className={`fixed right-3 top-[62%] z-30 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border shadow-[0_12px_32px_rgba(2,6,10,0.28)] transition lg:hidden ${mobilePanelState.ringClass}`}
            onClick={() => setMobileInsightsOpen(true)}
            type="button"
          >
            <span className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${mobilePanelState.dotClass}`} />
            <LayoutPanelLeft className="h-4 w-4" />
          </button>
        ) : null}

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
                      onClick={() => handleDismiss(dismissTarget.uuid, option.label)}
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
