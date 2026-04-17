import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type {
  NetaCollectionProfile,
  NetaNormalizedFeedArtifact,
  NetaRecommendationArtifact,
} from "@/lib/neta-next-collection";

const execFileAsync = promisify(execFile);
const CASE_SLUG = "neta-next-collection-recommendation";

function resolveCaseRoot(): string {
  const candidates = [
    "/Users/joany/Desktop/baize/one-river/context-practices/cases/neta-next-collection-recommendation",
    path.resolve(process.cwd(), "..", "..", "..", "..", "..", "..", "context-practices", "cases", CASE_SLUG),
    path.resolve(process.cwd(), "..", "..", "..", "..", "cases", CASE_SLUG),
    path.resolve(process.cwd(), "..", "..", "cases", CASE_SLUG),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "scripts", "neta-local"))) {
      return candidate;
    }
  }

  return candidates[0];
}

const CASE_ROOT = resolveCaseRoot();
const NETA_BIN = path.join(CASE_ROOT, "scripts", "neta-local");

const RECALL_SOURCE_WEIGHTS: Record<string, number> = {
  interactive: 3,
  community_hot: 2,
  community_latest: 2,
  community_following: 3,
  search: 3,
};

const CONCEPT_SCORE_WEIGHTS: Record<string, number> = {
  personality_test: 10,
  persona_profile: 8,
  same_style_remix: 2,
  childhood_meet: 8,
  outfit_reaction: 8,
  jiangnan_garden: 8,
  easter_collectible: 7,
  bottle_scene: 8,
  comic_dialogue: 5,
  interview_scene: 6,
};

const GENERIC_SEMANTIC_TOKENS = new Set([
  "character",
  "characters",
  "make",
  "image",
  "using",
  "core",
  "input",
  "brief",
  "preset",
  "description",
  "reference",
  "planning",
  "title",
  "uuid",
  "design",
  "生成",
  "设计",
  "角色",
  "根据角色信息决定",
  "根据角色设定",
  "参考所选角色",
  "设定角色",
  "完整提示词",
  "风格要求",
  "使用",
  "添加",
  "展示",
  "描述",
  "做同款",
  "捏同款",
  "基于",
  "首先根据",
  "然后生成",
  "画面要求",
  "图片",
  "图",
  "风格",
  "布局",
  "标题",
  "插画",
  "文案",
  "中文",
  "角色设定",
  "同款",
  "结果",
  "信息",
]);

const COMMUNITY_TAG_HINTS = ["捏捏", "开荒团", "社团", "活动", "首页", "狂欢节", "学院", "大本营", "小店"];
const LOW_SIGNAL_TAGS = new Set(["捏捏", "捏ta学院", "捏ta", "捏ta學院", "捏Ta学院"].map((tag) => tag.toLowerCase()));

const THEME_KEYWORD_MAP: Record<string, string[]> = {
  landscape: ["江南", "园林", "风景", "竹影", "亭台", "太湖石", "花窗", "水墨", "国画", "园林风景"],
  comic: ["漫画", "分镜", "互动", "对话框", "心声", "剧情"],
  poster: ["海报", "封面", "杂志", "排版", "宣传"],
  festival: ["复活节", "彩蛋", "春日", "兔耳"],
  duo: ["双人", "2人", "duo", "双子", "mirror", "镜面"],
  fantasy: ["幻想", "哥特", "超现实", "契约", "精灵", "能量"],
  ink_style: ["水墨", "水彩", "国风", "留白", "书法"],
};

const INTENT_RULES: Record<string, string[]> = {
  landscape_scene: ["江南", "园林", "风景", "竹影", "亭台", "景致"],
  character_comic: ["漫画", "互动", "剧情", "对话框", "心声"],
  event_poster: ["海报", "封面", "宣传", "展示", "排版"],
  object_collectible: ["彩蛋", "relic", "物件", "底座", "材质"],
  dual_character: ["双人", "2girls", "duo", "镜面", "mirror"],
};

const CONCEPT_RULES: Record<string, string[]> = {
  personality_test: ["sbti", "人格测试", "测试结果", "标签库"],
  same_style_remix: ["做同款", "同款", "捏同款", "演绎"],
  childhood_meet: ["小时候的自己", "儿时的自己", "从前的自己"],
  outfit_reaction: ["换上", "换装", "兔女郎装", "前后反应"],
  jiangnan_garden: ["江南", "园林", "亭台", "竹影", "花窗", "太湖石"],
  easter_collectible: ["复活节", "彩蛋", "collectible", "彩蛋罢"],
  bottle_scene: ["水瓶", "瓶中", "漂浮状态", "专属水瓶"],
  comic_dialogue: ["对话框", "心声文字", "漫画", "分镜"],
  interview_scene: ["采访", "记者", "麦克风", "问答"],
};

type JsonObject = Record<string, unknown>;

type FeedCollection = {
  uuid: string;
  name: string;
  description: string;
  module_id: string;
  template_id: string;
  cover_url: string;
  has_video: boolean;
  is_interactive: boolean;
  cta_info: JsonObject;
  tags: string[];
  creator: JsonObject;
  recall_sources: string[];
  recall_type: string;
  like_status: string;
  favor_status: string;
  like_count: number;
  seed_list_item?: JsonObject;
};

type ScoredCandidate = {
  uuid: string;
  title: string;
  score: number;
  confidence: string;
  reason_lines: string[];
  evidence: {
    tag_overlap: string[];
    semantic_overlap: string[];
    interaction_overlap: string[];
    theme_overlap: string[];
    intent_overlap: string[];
    concept_overlap: string[];
    format_overlap: string[];
    seed_character_overlap: string[];
    recall_source_overlap: string[];
    community_overlap: string[];
    negative_overlap: string[];
  };
  profile: NetaCollectionProfile;
};

export type NetaSessionRequest = {
  currentCollectionUuid?: string;
  currentSource?: string;
  requestMode?: "next" | "feed";
  likedCollectionUuids?: string[];
  dismissedCollectionUuids?: string[];
  seenCollectionUuids?: string[];
  feedPageCount?: number;
};

export type NetaSessionResponse = {
  current: NetaCollectionProfile;
  normalized: NetaNormalizedFeedArtifact;
  recommendation: NetaRecommendationArtifact;
  session: {
    currentCollectionUuid: string;
    likedCollectionUuids: string[];
    dismissedCollectionUuids: string[];
    seenCollectionUuids: string[];
    feedPageCount?: number;
  };
};

export type NetaBootstrapResponse = {
  current: NetaCollectionProfile;
  normalized: NetaNormalizedFeedArtifact;
  recommendation: NetaRecommendationArtifact;
};

export type NetaCommunityFeedRequest = {
  theme?: string;
  pageIndex?: number;
  pageSize?: number;
};

export type NetaCommunityFeedResponse = {
  items: NetaCollectionProfile[];
  pageIndex: number;
  pageSize: number;
  hasNextPage: boolean;
  theme: string;
};

export type NetaCommunityDetailRequest = {
  uuid: string;
};

export type NetaCommunityLikeRequest = {
  uuid: string;
  isCancel?: boolean;
};

export type NetaCommunityLikeResponse = {
  success: boolean;
  message: string;
  uuid: string;
  isCancel: boolean;
};

function buildPreviewProfile(feedItem: FeedCollection): NetaCollectionProfile {
  const ctaInfo = isRecord(feedItem.cta_info) ? feedItem.cta_info : {};
  const briefInput =
    isRecord(ctaInfo.launch_prompt) && typeof ctaInfo.launch_prompt.brief_input === "string"
      ? ctaInfo.launch_prompt.brief_input
      : typeof ctaInfo.brief_input === "string"
        ? ctaInfo.brief_input
        : "";

  const contentTags = feedItem.tags.filter((tag) => !isCommunityTag(tag) && !isLowSignalTag(tag)).slice(0, 6);
  const communityTags = feedItem.tags.filter((tag) => isCommunityTag(tag) && !isLowSignalTag(tag)).slice(0, 6);

  return {
    uuid: feedItem.uuid,
    title: feedItem.name,
    description: feedItem.description,
    creator_name: isRecord(feedItem.creator) && typeof feedItem.creator.nick_name === "string" ? feedItem.creator.nick_name : "",
    cover_url: feedItem.cover_url,
    collection_link: collectionLink(feedItem.uuid),
    content_tags: contentTags,
    community_tags: communityTags,
    cta_info: {
      brief_input: briefInput,
    },
    interaction_flags: unique([feedItem.is_interactive ? "interactive" : "", feedItem.has_video ? "video" : ""].filter(Boolean)),
    theme_labels: [],
    intent_labels: [],
    concept_labels: [],
    format_labels: unique([feedItem.is_interactive ? "interactive" : "", feedItem.has_video ? "video" : ""].filter(Boolean)),
    semantic_tokens: tokenize(`${feedItem.name} ${feedItem.description}`),
    like_status: feedItem.like_status,
    favor_status: feedItem.favor_status,
    like_count: feedItem.like_count,
    source_feed_item: {
      recall_sources: feedItem.recall_sources,
      recall_type: feedItem.recall_type,
    },
  };
}

type RecommendationLogContext = {
  requestId: string;
  stage: string;
  [key: string]: unknown;
};

function logInfo(message: string, context: RecommendationLogContext): void {
  console.info(`[neta-next] ${message}`, context);
}

function logError(message: string, context: RecommendationLogContext): void {
  console.error(`[neta-next] ${message}`, context);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items.filter(Boolean as never))];
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\u4e00-\u9fff]{2,}|[a-z0-9_]{3,}/g) ?? []);
}

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

async function runNetaJsonCommand(args: string[]): Promise<JsonObject> {
  const { stdout } = await execFileAsync(NETA_BIN, args, {
    cwd: CASE_ROOT,
    maxBuffer: 20 * 1024 * 1024,
  });
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed) as JsonObject;
  } catch (error) {
    const extracted = extractFirstJsonBlock(trimmed);
    if (extracted) {
      return JSON.parse(extracted) as JsonObject;
    }

    throw new Error(
      `Failed to parse JSON from neta command output: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function extractFirstJsonBlock(text: string): string | null {
  const startCandidates = [text.indexOf("{"), text.indexOf("[{")].filter((index) => index >= 0).sort((a, b) => a - b);

  for (const start of startCandidates) {
    const openChar = text[start];
    const closeChar = openChar === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
        continue;
      }

      if (char === openChar) {
        depth += 1;
      } else if (char === closeChar) {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, index + 1);
        }
      }
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCommandErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRetryableNetaError(error: unknown): boolean {
  const text = extractCommandErrorText(error).toLowerCase();
  return text.includes("timeout") || text.includes("need to login");
}

async function safeRunNetaJsonCommand(args: string[]): Promise<JsonObject | null> {
  const command = [NETA_BIN, ...args].join(" ");
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await runNetaJsonCommand(args);
    } catch (error) {
      const stderr =
        error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
          ? error.stderr.trim()
          : "";
      const stdout =
        error && typeof error === "object" && "stdout" in error && typeof error.stdout === "string"
          ? error.stdout.trim()
          : "";
      const retryable = isRetryableNetaError(error);

      logError("neta command failed", {
        requestId: "command",
        stage: "exec",
        command,
        attempt,
        retryable,
        error: extractCommandErrorText(error),
        stderr: stderr || undefined,
        stdout: stdout || undefined,
      });

      if (!retryable || attempt >= maxAttempts) {
        return null;
      }

      await sleep(250);
    }
  }

  return null;
}

async function safeReadCollection(uuid: string): Promise<JsonObject | null> {
  if (!uuid) {
    return null;
  }
  return safeRunNetaJsonCommand(["read_collection", "--uuid", uuid]);
}

function collectionLink(uuid: string): string {
  return `https://app.nieta.art/collection/interaction?uuid=${uuid}&entrance=community`;
}

function extractFeedCollections(payload: JsonObject, sourceName: string): FeedCollection[] {
  const modules = Array.isArray(payload.module_list) ? payload.module_list : [];
  const collections: FeedCollection[] = [];
  for (const module of modules) {
    if (!isRecord(module) || module.template_id !== "NORMAL" || !isRecord(module.json_data)) {
      continue;
    }
    const data = module.json_data;
    const uuid = typeof data.uuid === "string" ? data.uuid : typeof data.storyId === "string" ? data.storyId : "";
    if (!uuid) {
      continue;
    }
    const creator =
      isRecord(data.creator)
        ? data.creator
        : {
            uuid: typeof data.user_uuid === "string" ? data.user_uuid : "",
            name: typeof data.user_nick_name === "string" ? data.user_nick_name : "",
          };
    const rawTags = Array.isArray(data.tags)
      ? data.tags
      : Array.isArray(data.hashtag_names)
        ? data.hashtag_names
        : [];
    collections.push({
      uuid,
      name: typeof data.name === "string" ? data.name : "",
      description:
        typeof data.description === "string"
          ? data.description
          : typeof data.content === "string"
            ? data.content
            : "",
      module_id: typeof module.module_id === "string" ? module.module_id : "",
      template_id: "NORMAL",
      cover_url: typeof data.coverUrl === "string" ? data.coverUrl : "",
      has_video: Boolean(data.has_video ?? data.hasVideo),
      is_interactive: Boolean(data.is_interactive ?? data.isInteractive),
      cta_info: isRecord(data.cta_info) ? data.cta_info : {},
      tags: rawTags
        .map((tag) => (typeof tag === "string" ? tag : ""))
        .filter(Boolean),
      creator,
      recall_sources: [sourceName],
      recall_type: typeof data.recall_type === "string" ? data.recall_type : "",
      like_status: typeof data.likeStatus === "string" ? data.likeStatus : "",
      favor_status: typeof data.favorStatus === "string" ? data.favorStatus : "",
      like_count: typeof data.likeCount === "number" ? data.likeCount : 0,
    });
  }
  return collections;
}

function mergeFeedCollections(items: FeedCollection[]): FeedCollection[] {
  const merged = new Map<string, FeedCollection>();
  for (const item of items) {
    const existing = merged.get(item.uuid);
    if (!existing) {
      merged.set(item.uuid, { ...item, recall_sources: [...item.recall_sources], tags: [...item.tags] });
      continue;
    }
    existing.name ||= item.name;
    existing.description ||= item.description;
    existing.cover_url ||= item.cover_url;
    existing.has_video ||= item.has_video;
    existing.is_interactive ||= item.is_interactive;
    existing.recall_type ||= item.recall_type;
    existing.tags = unique([...existing.tags, ...item.tags]);
    existing.recall_sources = unique([...existing.recall_sources, ...item.recall_sources]);
  }
  return [...merged.values()];
}

function isCommunityTag(tag: string): boolean {
  const lowered = tag.toLowerCase();
  return COMMUNITY_TAG_HINTS.some((hint) => lowered.includes(hint.toLowerCase()));
}

function isLowSignalTag(tag: string): boolean {
  return LOW_SIGNAL_TAGS.has(tag.trim().toLowerCase());
}

function deriveLabels(haystack: string, rules: Record<string, string[]>): string[] {
  const normalized = haystack.toLowerCase();
  return Object.entries(rules)
    .filter(([, markers]) => markers.some((marker) => normalized.includes(marker.toLowerCase())))
    .map(([label]) => label);
}

function deriveConceptLabels(haystack: string): string[] {
  const labels = deriveLabels(haystack, CONCEPT_RULES);
  const personaMarkers = ["sbti", "mbti", "人格", "社恐", "高冷", "内向", "外向", "i人", "e人", "标签"];
  if (personaMarkers.some((marker) => haystack.toLowerCase().includes(marker.toLowerCase()))) {
    labels.push("persona_profile");
  }
  return unique(labels);
}

function buildCollectionProfile(feedItem: FeedCollection, detailPayload: JsonObject): NetaCollectionProfile {
  const collection = isRecord(detailPayload.collection) ? detailPayload.collection : {};
  const remix = isRecord(collection.remix) ? collection.remix : {};
  const launchPrompt = isRecord(remix.launch_prompt) ? remix.launch_prompt : {};
  const artifacts = Array.isArray(collection.artifacts) ? collection.artifacts : [];
  const tags = Array.isArray(collection.tags) ? collection.tags : [];
  const tagNames = tags
    .map((tag) => (isRecord(tag) && typeof tag.name === "string" ? tag.name.trim() : typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean);
  let coverUrl = feedItem.cover_url;
  if (!coverUrl) {
    for (const artifact of artifacts) {
      if (isRecord(artifact) && artifact.status === "SUCCESS" && typeof artifact.url === "string") {
        coverUrl = artifact.url;
        break;
      }
    }
  }

  const title = typeof collection.name === "string" ? collection.name : feedItem.name;
  const description = typeof collection.description === "string" ? collection.description : feedItem.description;
  const coreInput = typeof launchPrompt.core_input === "string" ? launchPrompt.core_input : "";
  const briefInput = typeof launchPrompt.brief_input === "string" ? launchPrompt.brief_input : "";
  const presetDescription = typeof remix.preset_description === "string" ? remix.preset_description : "";
  const referencePlanning = typeof remix.reference_planning === "string" ? remix.reference_planning : "";
  const ctaBlob = [coreInput, briefInput, presetDescription, referencePlanning].join(" ");

  const seedListItem = isRecord(feedItem.seed_list_item) ? feedItem.seed_list_item : {};
  const seedCharacterNames = Array.isArray(seedListItem.character_list)
    ? seedListItem.character_list
        .map((item) => (isRecord(item) && typeof item.name === "string" ? item.name.trim() : ""))
        .filter(Boolean)
    : [];
  const seedAspect = typeof seedListItem.aspect === "string" ? seedListItem.aspect : "";
  const seedPicCount = typeof seedListItem.picCount === "number" ? seedListItem.picCount : null;
  const formatLabels = unique([
    seedAspect,
    seedPicCount === 1 ? "single_image" : "",
    typeof seedPicCount === "number" && seedPicCount > 1 ? "multi_image" : "",
    feedItem.is_interactive ? "interactive" : "",
    feedItem.has_video ? "video" : "",
  ].filter(Boolean));

  const semanticTokens = unique(
    [
      ...tokenize(title),
      ...tokenize(description),
      ...tokenize(coreInput),
      ...tokenize(briefInput),
      ...tokenize(presetDescription),
      ...tokenize(referencePlanning),
      ...tagNames.map((tag) => tag.toLowerCase()),
    ].filter((token) => !GENERIC_SEMANTIC_TOKENS.has(token))
  );

  const interactionFlags = unique([
    feedItem.is_interactive ? "interactive" : "",
    feedItem.has_video ? "video" : "",
    /双人|2人|character2/.test(coreInput) ? "dual" : "",
    /漫画|分镜/.test(coreInput) ? "comic" : "",
    /采访|记者|麦克风/.test(`${title}${description}${coreInput}`) ? "interview" : "",
    /角色|演绎|互动/.test(`${title}${description}${coreInput}`) ? "roleplay" : "",
  ].filter(Boolean));

  const fullText = ` ${title} ${description} ${ctaBlob} `;
  const contentTags = tagNames.filter((tag) => !isCommunityTag(tag) && !isLowSignalTag(tag));
  const communityTags = tagNames.filter((tag) => isCommunityTag(tag) && !isLowSignalTag(tag));

  return {
    uuid: typeof collection.uuid === "string" ? collection.uuid : feedItem.uuid,
    title,
    description,
    creator_name: isRecord(collection.creator) && typeof collection.creator.name === "string" ? collection.creator.name : "",
    cover_url: coverUrl,
    collection_link: collectionLink(typeof collection.uuid === "string" ? collection.uuid : feedItem.uuid),
    content_tags: contentTags,
    community_tags: communityTags,
    cta_info: {
      brief_input: briefInput,
      core_input: coreInput,
      preset_description: presetDescription,
      reference_planning: referencePlanning,
    },
    interaction_flags: interactionFlags,
    theme_labels: unique(deriveLabels(fullText, THEME_KEYWORD_MAP)),
    intent_labels: unique(deriveLabels(fullText, INTENT_RULES)),
    concept_labels: deriveConceptLabels(fullText),
    format_labels: formatLabels,
    semantic_tokens: semanticTokens,
    like_status:
      typeof collection.likeStatus === "string"
        ? collection.likeStatus
        : typeof seedListItem.likeStatus === "string"
          ? seedListItem.likeStatus
          : feedItem.like_status,
    favor_status:
      typeof collection.favorStatus === "string"
        ? collection.favorStatus
        : typeof seedListItem.favorStatus === "string"
          ? seedListItem.favorStatus
          : feedItem.favor_status,
    like_count:
      typeof collection.likeCount === "number"
        ? collection.likeCount
        : typeof seedListItem.likeCount === "number"
          ? seedListItem.likeCount
          : feedItem.like_count,
    source_feed_item: {
      recall_sources: feedItem.recall_sources,
      recall_type: feedItem.recall_type,
    },
    seed_character_names: seedCharacterNames,
    seed_aspect: seedAspect,
    seed_pic_count: seedPicCount,
  } as NetaCollectionProfile;
}

function buildDetailSeedFeedItem(detailPayload: JsonObject): FeedCollection {
  const collection = isRecord(detailPayload.collection) ? detailPayload.collection : {};
  const remix = isRecord(collection.remix) ? collection.remix : {};
  const launchPrompt = isRecord(remix.launch_prompt) ? remix.launch_prompt : {};
  const artifacts = Array.isArray(collection.artifacts) ? collection.artifacts : [];
  let coverUrl = "";
  for (const artifact of artifacts) {
    if (isRecord(artifact) && artifact.status === "SUCCESS" && typeof artifact.url === "string") {
      coverUrl = artifact.url;
      break;
    }
  }
  return {
    uuid: typeof collection.uuid === "string" ? collection.uuid : "",
    name: typeof collection.name === "string" ? collection.name : "",
    description: typeof collection.description === "string" ? collection.description : "",
    module_id: "seed_collection",
    template_id: "SEED",
    cover_url: coverUrl,
    has_video: artifacts.some((artifact) => isRecord(artifact) && artifact.modality === "VIDEO" && artifact.status === "SUCCESS"),
    is_interactive: true,
    cta_info: launchPrompt,
    tags: Array.isArray(collection.tags)
      ? collection.tags
          .map((tag) => (isRecord(tag) && typeof tag.name === "string" ? tag.name.trim() : ""))
          .filter(Boolean)
      : [],
    creator: isRecord(collection.creator) ? collection.creator : {},
    recall_sources: ["seed"],
    recall_type: "seed",
    like_status: typeof collection.likeStatus === "string" ? collection.likeStatus : "",
    favor_status: typeof collection.favorStatus === "string" ? collection.favorStatus : "",
    like_count: typeof collection.likeCount === "number" ? collection.likeCount : 0,
  };
}

function buildSeedFeedItemFromListItem(listItem: JsonObject): FeedCollection {
  return {
    uuid: typeof listItem.storyId === "string" ? listItem.storyId : "",
    name: typeof listItem.name === "string" ? listItem.name : "",
    description: typeof listItem.content === "string" ? listItem.content : "",
    module_id: "seed_collection",
    template_id: "SEED",
    cover_url: typeof listItem.coverUrl === "string" ? listItem.coverUrl : "",
    has_video: Boolean(listItem.has_video ?? listItem.hasVideo),
    is_interactive: Boolean(listItem.is_interactive ?? listItem.isInteractive ?? true),
    cta_info: {},
    tags: [],
    creator: {
      uuid: typeof listItem.user_uuid === "string" ? listItem.user_uuid : "",
      name: typeof listItem.user_nick_name === "string" ? listItem.user_nick_name : "",
    },
    recall_sources: ["seed"],
    recall_type: "seed",
    like_status: typeof listItem.likeStatus === "string" ? listItem.likeStatus : "",
    favor_status: typeof listItem.favorStatus === "string" ? listItem.favorStatus : "",
    like_count: typeof listItem.likeCount === "number" ? listItem.likeCount : 0,
    seed_list_item: listItem,
  };
}

async function pickItemFromListCommand(commandName: string): Promise<JsonObject | null> {
  const payload = await safeRunNetaJsonCommand([commandName, "--page_size", "1"]);
  if (!payload || !Array.isArray(payload.items) || !payload.items.length || !isRecord(payload.items[0])) {
    return null;
  }
  return payload.items[0];
}

function deriveSearchQueries(current: NetaCollectionProfile): string[] {
  const queries = [
    ...(current.content_tags ?? []).slice(0, 2),
    ...((current as NetaCollectionProfile & { seed_character_names?: string[] }).seed_character_names ?? []).slice(0, 1),
    ...(current.concept_labels ?? []).filter((item) => item !== "same_style_remix"),
    ...tokenize(current.title ?? "").slice(0, 2),
  ];
  return unique(
    queries
      .map((query) => query.trim().replaceAll("_", " "))
      .filter(Boolean)
  ).slice(0, 3);
}

function buildFrequencyMap(profiles: NetaCollectionProfile[], key: keyof NetaCollectionProfile): Map<string, number> {
  const map = new Map<string, number>();
  for (const profile of profiles) {
    const values = Array.isArray(profile[key]) ? (profile[key] as string[]) : [];
    for (const value of values) {
      const normalized = value.toLowerCase();
      map.set(normalized, (map.get(normalized) ?? 0) + 1);
    }
  }
  return map;
}

function frequencySum(values: string[], map: Map<string, number>): number {
  return values.reduce((sum, value) => sum + (map.get(value.toLowerCase()) ?? 0), 0);
}

function overlap(left: string[] = [], right: string[] = []): string[] {
  const rightSet = new Set(right.map((item) => item.toLowerCase()));
  return unique(left.filter((item) => rightSet.has(item.toLowerCase())));
}

function scoreCandidate(
  current: NetaCollectionProfile,
  candidate: NetaCollectionProfile,
  likedProfiles: NetaCollectionProfile[],
  dismissedProfiles: NetaCollectionProfile[],
): ScoredCandidate {
  const likedConcepts = buildFrequencyMap(likedProfiles, "concept_labels");
  const likedIntents = buildFrequencyMap(likedProfiles, "intent_labels");
  const likedThemes = buildFrequencyMap(likedProfiles, "theme_labels");
  const likedTags = buildFrequencyMap(likedProfiles, "content_tags");
  const likedCommunities = buildFrequencyMap(likedProfiles, "community_tags");
  const dislikedConcepts = buildFrequencyMap(dismissedProfiles, "concept_labels");
  const dislikedIntents = buildFrequencyMap(dismissedProfiles, "intent_labels");
  const dislikedThemes = buildFrequencyMap(dismissedProfiles, "theme_labels");
  const dislikedTags = buildFrequencyMap(dismissedProfiles, "content_tags");
  const dislikedCommunities = buildFrequencyMap(dismissedProfiles, "community_tags");

  const conceptOverlap = overlap(current.concept_labels, candidate.concept_labels);
  const intentOverlap = overlap(current.intent_labels, candidate.intent_labels);
  const themeOverlap = overlap(current.theme_labels, candidate.theme_labels);
  const tagOverlap = overlap(current.content_tags, candidate.content_tags);
  const formatOverlap = overlap(current.format_labels, candidate.format_labels);
  const interactionOverlap: string[] = [];
  const communityOverlap = overlap(current.community_tags, candidate.community_tags);
  const semanticOverlap = overlap(current.semantic_tokens, candidate.semantic_tokens).slice(0, 10);
  const seedCharacterOverlap = overlap(
    ((current as NetaCollectionProfile & { seed_character_names?: string[] }).seed_character_names) ?? [],
    [...(candidate.content_tags ?? []), ...(candidate.community_tags ?? [])]
  );

  let score = 0;
  score += conceptOverlap.reduce((sum, label) => sum + (CONCEPT_SCORE_WEIGHTS[label] ?? 5), 0);
  score += intentOverlap.length * 6;
  score += themeOverlap.length * 5;
  score += Math.min(tagOverlap.length, 4) * 4;
  score += formatOverlap.length * 2;
  score += 0;
  score += communityOverlap.length;
  score += semanticOverlap.length;
  score += seedCharacterOverlap.length * 4;
  score += (candidate.source_feed_item?.recall_sources ?? []).reduce((sum, source) => sum + (RECALL_SOURCE_WEIGHTS[source] ?? 1), 0);

  score += frequencySum(candidate.concept_labels ?? [], likedConcepts) * 3;
  score += frequencySum(candidate.intent_labels ?? [], likedIntents) * 4;
  score += frequencySum(candidate.theme_labels ?? [], likedThemes) * 2;
  score += frequencySum(candidate.content_tags ?? [], likedTags);
  score += frequencySum(candidate.community_tags ?? [], likedCommunities);

  const negativeOverlap = unique([
    ...overlap(candidate.concept_labels, dismissedProfiles.flatMap((item) => item.concept_labels ?? [])),
    ...overlap(candidate.intent_labels, dismissedProfiles.flatMap((item) => item.intent_labels ?? [])),
    ...overlap(candidate.theme_labels, dismissedProfiles.flatMap((item) => item.theme_labels ?? [])),
    ...overlap(candidate.content_tags, dismissedProfiles.flatMap((item) => item.content_tags ?? [])),
  ]);

  score -= frequencySum(candidate.concept_labels ?? [], dislikedConcepts) * 5;
  score -= frequencySum(candidate.intent_labels ?? [], dislikedIntents) * 6;
  score -= frequencySum(candidate.theme_labels ?? [], dislikedThemes) * 4;
  score -= frequencySum(candidate.content_tags ?? [], dislikedTags) * 2;
  score -= frequencySum(candidate.community_tags ?? [], dislikedCommunities) * 2;
  score -= negativeOverlap.length * 2;

  if (!conceptOverlap.length && !intentOverlap.length && !themeOverlap.length && !tagOverlap.length) {
    score -= 2;
  }

  const reasonLines: string[] = [];
  if (conceptOverlap.length) {
    reasonLines.push(`概念连续：${conceptOverlap.slice(0, 3).join(" / ")}`);
  }
  if (intentOverlap.length) {
    reasonLines.push(`玩法意图：${intentOverlap.slice(0, 3).join(" / ")}`);
  }
  if (themeOverlap.length) {
    reasonLines.push(`主题连续：${themeOverlap.slice(0, 3).join(" / ")}`);
  }
  if (tagOverlap.length) {
    reasonLines.push(`标签重合：${tagOverlap.slice(0, 4).join(" / ")}`);
  }
  if (!reasonLines.length && semanticOverlap.length) {
    reasonLines.push(`语义接近：${semanticOverlap.slice(0, 4).join(" / ")}`);
  }
  if (!reasonLines.length) {
    reasonLines.push("保留为下一条候选，等待更多用户信号。");
  }

  const confidence = score >= 28 ? "high" : score >= 14 ? "medium" : "low";

  return {
    uuid: candidate.uuid,
    title: candidate.title,
    score,
    confidence,
    reason_lines: reasonLines,
    evidence: {
      tag_overlap: tagOverlap,
      semantic_overlap: semanticOverlap,
      interaction_overlap: interactionOverlap,
      theme_overlap: themeOverlap,
      intent_overlap: intentOverlap,
      concept_overlap: conceptOverlap,
      format_overlap: formatOverlap,
      seed_character_overlap: seedCharacterOverlap,
      recall_source_overlap: candidate.source_feed_item?.recall_sources ?? [],
      community_overlap: communityOverlap,
      negative_overlap: negativeOverlap,
    },
    profile: candidate,
  };
}

async function resolveSeedCollectionUuid(request: NetaSessionRequest): Promise<{ uuid: string; source: string; listItem?: JsonObject }> {
  if (request.currentCollectionUuid) {
    return { uuid: request.currentCollectionUuid, source: "explicit_uuid" };
  }
  if (request.currentSource === "liked") {
    const liked = await pickItemFromListCommand("get_liked_list");
    const uuid = liked && typeof liked.storyId === "string" ? liked.storyId : "";
    if (uuid) {
      return { uuid, source: "liked_list", listItem: liked ?? undefined };
    }
  }
  if (request.currentSource === "favorited") {
    const favor = await pickItemFromListCommand("get_favor_list");
    const uuid = favor && typeof favor.storyId === "string" ? favor.storyId : "";
    if (uuid) {
      return { uuid, source: "favor_list", listItem: favor ?? undefined };
    }
  }
  const liked = await pickItemFromListCommand("get_liked_list");
  if (liked && typeof liked.storyId === "string" && liked.storyId) {
    return { uuid: liked.storyId, source: "liked_list", listItem: liked ?? undefined };
  }
  const favor = await pickItemFromListCommand("get_favor_list");
  if (favor && typeof favor.storyId === "string" && favor.storyId) {
    return { uuid: favor.storyId, source: "favor_list", listItem: favor ?? undefined };
  }
  return { uuid: "", source: "interactive_fallback" };
}

async function loadFeedPages(command: string[], sourceName: string, pages = 2, pageSize = 16): Promise<FeedCollection[]> {
  const results: FeedCollection[] = [];
  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const payload = await safeRunNetaJsonCommand([...command, "--page_index", String(pageIndex), "--page_size", String(pageSize)]);
    if (!payload) {
      continue;
    }
    results.push(...extractFeedCollections(payload, sourceName));
  }
  return results;
}

async function buildProfileFromFeedItem(item: FeedCollection): Promise<NetaCollectionProfile | null> {
  const detail = await safeReadCollection(item.uuid);
  if (!detail) {
    return null;
  }
  return buildCollectionProfile(item, detail);
}

async function buildProfileFromUuid(uuid: string): Promise<NetaCollectionProfile | null> {
  const detail = await safeReadCollection(uuid);
  if (!detail) {
    return null;
  }
  return buildCollectionProfile(buildDetailSeedFeedItem(detail), detail);
}

export async function getLiveNetaCommunityFeed(
  request: NetaCommunityFeedRequest = {}
): Promise<NetaCommunityFeedResponse> {
  const theme = request.theme?.trim() || "热门";
  const pageIndex = Math.max(0, request.pageIndex ?? 0);
  const pageSize = Math.max(1, Math.min(request.pageSize ?? 12, 24));
  const payload = await safeRunNetaJsonCommand([
    "request_community_feed",
    "--theme",
    theme,
    "--page_index",
    String(pageIndex),
    "--page_size",
    String(pageSize),
  ]);

  if (!payload) {
    throw new Error(`Unable to load community feed: ${theme}`);
  }

  const items = extractFeedCollections(payload, `community_${theme}`).map((item) => buildPreviewProfile(item));
  const pageData = isRecord(payload.page_data) ? payload.page_data : {};

  return {
    items,
    pageIndex,
    pageSize,
    hasNextPage: Boolean(pageData.has_next_page),
    theme,
  };
}

export async function getLiveNetaCommunityDetail(
  request: NetaCommunityDetailRequest
): Promise<NetaCollectionProfile> {
  if (!request.uuid?.trim()) {
    throw new Error("Missing collection uuid");
  }

  const profile = await buildProfileFromUuid(request.uuid.trim());
  if (!profile) {
    throw new Error(`Unable to load community collection detail: ${request.uuid}`);
  }

  return profile;
}

export async function commitLiveNetaCommunityLike(
  request: NetaCommunityLikeRequest
): Promise<NetaCommunityLikeResponse> {
  const uuid = request.uuid?.trim();
  if (!uuid) {
    throw new Error("Missing collection uuid");
  }

  const args = ["like_collection", "--uuid", uuid];
  if (request.isCancel) {
    args.push("--is_cancel", "true");
  }

  const payload = await safeRunNetaJsonCommand(args);
  if (!payload) {
    throw new Error(`${request.isCancel ? "Unlike" : "Like"} collection failed: ${uuid}`);
  }

  const success = payload.success === true;
  const message =
    typeof payload.message === "string"
      ? payload.message
      : success
        ? request.isCancel
          ? "unliked success"
          : "liked success"
        : `${request.isCancel ? "Unlike" : "Like"} collection failed`;

  if (!success) {
    throw new Error(message);
  }

  return {
    success,
    message,
    uuid,
    isCancel: Boolean(request.isCancel),
  };
}

export async function getInitialNetaRecommendationBootstrap(
  request: Pick<NetaSessionRequest, "currentCollectionUuid" | "currentSource"> = {}
): Promise<NetaBootstrapResponse> {
  const seed = await resolveSeedCollectionUuid(request);
  let currentProfile: NetaCollectionProfile | null = null;

  if (seed.uuid) {
    if (seed.listItem) {
      const detail = await safeReadCollection(seed.uuid);
      if (detail) {
        currentProfile = buildCollectionProfile(buildSeedFeedItemFromListItem(seed.listItem), detail);
      }
    }

    if (!currentProfile) {
      currentProfile = await buildProfileFromUuid(seed.uuid);
    }
  }

  if (!currentProfile) {
    throw new Error("Unable to resolve initial Neta seed");
  }

  return {
    current: currentProfile,
    normalized: {
      current_collection: currentProfile,
      candidate_collections: [],
      candidate_count: 0,
      recall_summary: {
        sources: { bootstrap: 1 },
        merged_candidate_count: 0,
        search_queries: [],
      },
    },
    recommendation: {
      case_id: "neta-next-collection-recommendation",
      status: "bootstrap",
      current_collection_uuid: currentProfile.uuid,
      current_collection_title: currentProfile.title,
      current_collection_cover_url: currentProfile.cover_url,
      current_collection_link: currentProfile.collection_link,
      recommended_collection_uuid: "",
      recommended_collection_title: "",
      recommended_collection_cover_url: "",
      recommended_collection_link: "",
      recommendation_reason: "",
      explanation: {
        summary: "Bootstrap current seed only. Recommendation queue loads asynchronously after page mount.",
        reason_lines: [],
      },
      evidence: {
        source: "neta_bootstrap",
        selection_rule: "latest_liked_seed_only",
        candidate_count: 0,
        current_seed_mode: seed.source,
        top_candidate_confidence: "pending",
        feed_page_count: 0,
      },
      fallback_candidates: [],
    },
  };
}

export async function getLiveNetaRecommendationSession(
  request: NetaSessionRequest = {}
): Promise<NetaSessionResponse> {
  const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let stage = "init";
  try {
    const likedCollectionUuids = unique(request.likedCollectionUuids ?? []);
    const dismissedCollectionUuids = unique(request.dismissedCollectionUuids ?? []);
    const feedPageCount = Math.max(1, Math.min(request.feedPageCount ?? 2, 6));
    const seenCollectionUuids = unique([
      ...(request.seenCollectionUuids ?? []),
      ...likedCollectionUuids,
      ...dismissedCollectionUuids,
    ]);

    logInfo("session start", {
      requestId,
      stage,
      currentCollectionUuid: request.currentCollectionUuid ?? "",
      currentSource: request.currentSource ?? "",
      likedCount: likedCollectionUuids.length,
      dismissedCount: dismissedCollectionUuids.length,
      seenCount: seenCollectionUuids.length,
      feedPageCount,
    });

    stage = "resolve_seed";
    const seed = await resolveSeedCollectionUuid(request);

    stage = "load_interactive";
    const interactiveCollections = await loadFeedPages(["request_interactive_feed"], "interactive", feedPageCount);
    logInfo("interactive feed loaded", {
      requestId,
      stage,
      seedUuid: seed.uuid,
      seedSource: seed.source,
      interactiveCount: interactiveCollections.length,
      feedPageCount,
    });

    stage = "resolve_current";
    let currentFeedItem = interactiveCollections.find((item) => item.uuid === seed.uuid) ?? null;
    let currentDetail: JsonObject;

    if (currentFeedItem) {
      const detail = await safeReadCollection(currentFeedItem.uuid);
      if (!detail) {
        throw new Error(`Unable to load current collection detail: ${currentFeedItem.uuid}`);
      }
      currentDetail = detail;
    } else if (seed.uuid) {
      const detail = await safeReadCollection(seed.uuid);
      if (!detail) {
        currentFeedItem = interactiveCollections[0] ?? null;
        if (!currentFeedItem) {
          throw new Error(`Unable to load seed collection detail: ${seed.uuid}`);
        }
        const fallbackDetail = await safeReadCollection(currentFeedItem.uuid);
        if (!fallbackDetail) {
          throw new Error(`Unable to load fallback current collection detail: ${currentFeedItem.uuid}`);
        }
        currentDetail = fallbackDetail;
      } else {
        currentDetail = detail;
        currentFeedItem = seed.listItem ? buildSeedFeedItemFromListItem(seed.listItem) : buildDetailSeedFeedItem(currentDetail);
      }
    } else {
      if (!interactiveCollections.length) {
        throw new Error("No interactive feed collections available");
      }
      currentFeedItem = interactiveCollections[0];
      const detail = await safeReadCollection(currentFeedItem.uuid);
      if (!detail) {
        throw new Error(`Unable to load fallback current collection detail: ${currentFeedItem.uuid}`);
      }
      currentDetail = detail;
    }

    const currentProfile = buildCollectionProfile(currentFeedItem, currentDetail);
    const searchQueries = deriveSearchQueries(currentProfile);
    logInfo("current resolved", {
      requestId,
      stage,
      currentUuid: currentProfile.uuid,
      currentTitle: currentProfile.title,
      searchQueries,
    });

    stage = "load_recall";
    const requestMode = request.requestMode === "feed" ? "feed" : "next";
    const effectiveFeedPageCount = requestMode === "feed" ? Math.max(1, Math.ceil((request.feedPageCount ?? 2) / 2)) : 1;
    const recallCollections = requestMode === "feed"
      ? [
          ...(await loadFeedPages(["request_community_feed", "--theme", "热门"], "community_hot", effectiveFeedPageCount)),
          ...(await loadFeedPages(["request_community_feed", "--theme", "最新"], "community_latest", effectiveFeedPageCount)),
          ...(await loadFeedPages(["request_community_feed", "--theme", "关注"], "community_following", effectiveFeedPageCount)),
        ]
      : [
          ...interactiveCollections,
          ...(await loadFeedPages(["request_community_feed", "--theme", "热门"], "community_hot", 1)),
          ...(await loadFeedPages(["request_community_feed", "--theme", "最新"], "community_latest", 1)),
          ...(await loadFeedPages(["request_community_feed", "--theme", "关注"], "community_following", 1)),
        ];

    for (const query of searchQueries) {
      recallCollections.push(
        ...(await loadFeedPages(
          ["suggest_content", "--intent", "search", "--search_keywords", query],
          "search",
          1,
          12
        ))
      );
    }

    const mergedRecallCollections = mergeFeedCollections(recallCollections);
    const excluded = new Set([currentProfile.uuid, ...seenCollectionUuids]);
    const candidateFeedItems = mergedRecallCollections.filter((item) => !excluded.has(item.uuid)).slice(0, Math.max(18, feedPageCount * 12));
    logInfo("recall prepared", {
      requestId,
      stage,
      recallCount: recallCollections.length,
      mergedRecallCount: mergedRecallCollections.length,
      excludedCount: excluded.size,
      candidateFeedItemCount: candidateFeedItems.length,
    });

    stage = "load_candidates";
    const candidateProfiles = (
      await Promise.all(candidateFeedItems.map((item) => buildProfileFromFeedItem(item)))
    ).filter((item): item is NetaCollectionProfile => Boolean(item));

    const signalIds = unique([...likedCollectionUuids, ...dismissedCollectionUuids]).filter(
      (uuid) => uuid && uuid !== currentProfile.uuid
    );
    const signalProfiles = (await Promise.all(signalIds.map((uuid) => buildProfileFromUuid(uuid)))).filter(
      (item): item is NetaCollectionProfile => Boolean(item)
    );
    const likedProfiles = signalProfiles.filter((profile) => likedCollectionUuids.includes(profile.uuid));
    const dismissedProfiles = signalProfiles.filter((profile) => dismissedCollectionUuids.includes(profile.uuid));
    logInfo("profiles loaded", {
      requestId,
      stage,
      candidateProfileCount: candidateProfiles.length,
      signalCount: signalIds.length,
      signalProfileCount: signalProfiles.length,
      likedProfileCount: likedProfiles.length,
      dismissedProfileCount: dismissedProfiles.length,
    });

    stage = "rerank";
    const scoredCandidates = candidateProfiles
      .map((candidate) => scoreCandidate(currentProfile, candidate, likedProfiles, dismissedProfiles))
      .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "zh-CN"));

    const recommended = scoredCandidates[0] ?? null;
    const fallbacks = scoredCandidates.slice(1, 4);
    logInfo("rerank complete", {
      requestId,
      stage,
      recommendedUuid: recommended?.uuid ?? "",
      recommendedTitle: recommended?.title ?? "",
      recommendedScore: recommended?.score ?? null,
      fallbackCount: fallbacks.length,
    });

    const normalized: NetaNormalizedFeedArtifact = {
      current_collection: currentProfile,
      candidate_collections: candidateProfiles,
      candidate_count: candidateProfiles.length,
      recall_summary: {
        sources: {
          interactive: interactiveCollections.length,
          community_hot: recallCollections.filter((item) => item.recall_sources.includes("community_hot")).length,
          community_latest: recallCollections.filter((item) => item.recall_sources.includes("community_latest")).length,
          community_following: recallCollections.filter((item) => item.recall_sources.includes("community_following")).length,
        },
        search_queries: searchQueries,
        merged_candidate_count: candidateProfiles.length,
        mode: requestMode,
      },
    };

    const recommendation: NetaRecommendationArtifact = {
      case_id: "neta-next-collection-recommendation",
      status: recommended ? "ok" : "empty",
      current_collection_uuid: currentProfile.uuid,
      current_collection_title: currentProfile.title,
      current_collection_cover_url: currentProfile.cover_url,
      current_collection_link: currentProfile.collection_link,
      recommended_collection_uuid: recommended?.uuid ?? "",
      recommended_collection_title: recommended?.title ?? "",
      recommended_collection_cover_url: recommended?.profile.cover_url ?? "",
      recommended_collection_link: recommended?.profile.collection_link ?? "",
      recommendation_reason: recommended?.reason_lines[0] ?? "",
      explanation: {
        summary: "Recommendation is continuously reranked from live Neta feeds using the current collection, positive likes, and negative skip signals.",
        reason_lines: recommended?.reason_lines ?? [],
      },
      evidence: {
        source: "neta_live_feed",
        selection_rule: "context_driven_rerank_with_negative_feedback",
        candidate_count: candidateProfiles.length,
        current_seed_mode: seed.source,
        top_candidate_confidence: recommended?.confidence ?? "low",
        feed_page_count: feedPageCount,
      },
      fallback_candidates: fallbacks.map((item) => ({
        uuid: item.uuid,
        title: item.title,
        score: item.score,
        confidence: item.confidence,
        reason_lines: item.reason_lines,
      })),
    };

    logInfo("session success", {
      requestId,
      stage: "complete",
      currentUuid: currentProfile.uuid,
      recommendedUuid: recommendation.recommended_collection_uuid,
      candidateCount: candidateProfiles.length,
    });

    return {
      current: currentProfile,
      normalized,
      recommendation,
      session: {
        currentCollectionUuid: currentProfile.uuid,
        likedCollectionUuids,
        dismissedCollectionUuids,
        seenCollectionUuids: unique([currentProfile.uuid, ...seenCollectionUuids]),
        feedPageCount,
      },
    };
  } catch (error) {
    logError("session failed", {
      requestId,
      stage,
      currentCollectionUuid: request.currentCollectionUuid ?? "",
      currentSource: request.currentSource ?? "",
      likedCount: request.likedCollectionUuids?.length ?? 0,
      dismissedCount: request.dismissedCollectionUuids?.length ?? 0,
      seenCount: request.seenCollectionUuids?.length ?? 0,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
