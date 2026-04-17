import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type NetaCollectionProfile = {
  uuid: string;
  title: string;
  description?: string;
  creator_name?: string;
  cover_url?: string;
  collection_link?: string;
  content_tags?: string[];
  community_tags?: string[];
  cta_info?: {
    brief_input?: string;
    core_input?: string;
    preset_description?: string;
    reference_planning?: string;
  };
  interaction_flags?: string[];
  theme_labels?: string[];
  intent_labels?: string[];
  concept_labels?: string[];
  format_labels?: string[];
  semantic_tokens?: string[];
  like_status?: string;
  favor_status?: string;
  like_count?: number;
  source_feed_item?: {
    recall_sources?: string[];
    recall_type?: string;
  };
};

export type NetaRecommendationArtifact = {
  case_id: string;
  status: string;
  current_collection_uuid: string;
  current_collection_title: string;
  current_collection_cover_url?: string;
  current_collection_link?: string;
  recommended_collection_uuid: string;
  recommended_collection_title: string;
  recommended_collection_cover_url?: string;
  recommended_collection_link?: string;
  recommendation_reason?: string;
  explanation?: {
    summary?: string;
    reason_lines?: string[];
  };
  evidence?: {
    source?: string;
    selection_rule?: string;
    candidate_count?: number;
    current_seed_mode?: string;
    top_candidate_confidence?: string;
    feed_page_count?: number;
    llm_rerank?: {
      confidence?: string;
      reason_summary?: string;
      reason_lines?: string[];
    };
  };
  fallback_candidates?: Array<{
    uuid: string;
    title: string;
    score: number;
    confidence?: string;
    reason_lines?: string[];
  }>;
};

export type NetaNormalizedFeedArtifact = {
  current_collection: NetaCollectionProfile;
  candidate_collections: NetaCollectionProfile[];
  candidate_count: number;
  recall_summary?: {
    sources?: string[] | Record<string, number>;
    merged_candidate_count?: number;
    search_queries?: string[];
    search_sources?: string[] | Record<string, number>;
    mode?: "next" | "feed";
  };
};

export type NetaRecommendationCaseData = {
  current: NetaCollectionProfile;
  normalized: NetaNormalizedFeedArtifact;
  recommendation: NetaRecommendationArtifact;
};

const OUTPUTS_ROOT = path.resolve(
  process.cwd(),
  "..",
  "..",
  "cases",
  "neta-next-collection-recommendation",
  "outputs"
);

function readJsonFile<T>(fileName: string): T {
  const filePath = path.join(OUTPUTS_ROOT, fileName);
  if (!existsSync(filePath)) {
    throw new Error(`Missing artifact: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function loadNetaRecommendationCaseData(): NetaRecommendationCaseData {
  return {
    current: readJsonFile<NetaCollectionProfile>("current-profile.json"),
    normalized: readJsonFile<NetaNormalizedFeedArtifact>("normalized-feed.json"),
    recommendation: readJsonFile<NetaRecommendationArtifact>("recommendation.json"),
  };
}
