import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

type SnapshotConfig = {
  name?: string;
  genre: string;
  tone: string;
  era: string;
  rules: string[];
  overview?: string;
  coreConflict?: string;
  language?: "zh" | "en";
};

type SnapshotAtom = {
  id: string;
  type: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: number;
  updatedAt?: number;
};

type SnapshotWork = {
  id: string;
  title: string;
  content: string;
  atomIds: string[];
  createdAt: number;
};

type SnapshotSession = {
  activeConversationId: string | null;
  recentUserMessages: string[];
  recentAssistantMessages: string[];
  recentViewedAtomIds: string[];
  recentViewedWorkIds: string[];
  recentCreatedAtomIds: string[];
  recentCreatedWorkIds: string[];
};

type StudioWorldSnapshot = {
  worldId: string;
  config: SnapshotConfig | null;
  atoms: SnapshotAtom[];
  works: SnapshotWork[];
  session: SnapshotSession;
};

type ContinuationCandidate = {
  id: string;
  dynamicType: "tension" | "gap" | "promise" | "contradiction" | "escalation" | "resolution";
  sourceAtomIds: string[];
  sourceWorkIds: string[];
  worldReason: string;
  brief: string;
};

type ContinuationOffer = {
  id: string;
  candidateId: string;
  headline: string;
  whyNow: string;
  sourceAtomIds: string[];
  sourceWorkIds: string[];
  actionType: "continue" | "deepen" | "escalate" | "reveal" | "variant" | "bind";
  expectedOutput: "new_work" | "work_variant" | "atom_variant" | "new_scene";
  intensity: "light" | "deep" | "intense";
  estimatedTokenCost: number;
  creditPrice: number;
  score: number;
  scoreBreakdown: {
    attachment: number;
    urgency: number;
    pull: number;
    worldFit: number;
    costPenalty: number;
    repetitionPenalty: number;
  };
};

type ContinuationExecutionRequest = {
  worldId: string;
  offerId: string;
  actionType: ContinuationOffer["actionType"];
  expectedOutput: ContinuationOffer["expectedOutput"];
  sourceAtomIds: string[];
  sourceWorkIds: string[];
  promptBrief: string;
  worldReason: string;
  executionNotes: string[];
  writebackPlan: {
    target: "works" | "atoms";
    mode: "append" | "replace" | "merge";
    followup: string;
  };
};

type ContinuationContext = {
  worldId: string;
  worldName: string | null;
  config: SnapshotConfig | null;
  atoms: SnapshotAtom[];
  works: SnapshotWork[];
  session: SnapshotSession;
  readiness: {
    ready: boolean;
    reason: string;
  };
};

type EngineModule = {
  adaptNetaStudioRuntimeInput: (input: {
    snapshot: StudioWorldApiSnapshot;
    chatSession?: StudioChatSessionPayload | null;
  }) => StudioWorldSnapshot;
  assembleNetaStudioContext: (snapshot: StudioWorldSnapshot) => ContinuationContext;
  deriveNetaStudioContinuationCandidates: (context: ContinuationContext) => ContinuationCandidate[];
  rankNetaStudioContinuationOffers: (
    context: ContinuationContext,
    candidates: ContinuationCandidate[],
  ) => ContinuationOffer[];
  composeNetaStudioContinuationRequest: (
    context: ContinuationContext,
    offer: ContinuationOffer,
    candidate: ContinuationCandidate,
  ) => ContinuationExecutionRequest;
};

export type ContinuationFixtureViewModel = {
  id: string;
  label: string;
  description: string;
  snapshot: StudioWorldSnapshot;
  context: ContinuationContext;
  candidates: ContinuationCandidate[];
  offers: ContinuationOffer[];
  request: ContinuationExecutionRequest | null;
};

export type ContinuationPlaygroundData = {
  caseSlug: string;
  title: string;
  summary: string;
  mode: "fixture" | "live";
  activeWorldId: string | null;
  suggestedWorlds: Array<{
    id: string;
    name: string;
    atomCount: number;
    workCount: number;
    updatedAt: number;
  }>;
  fixtures: ContinuationFixtureViewModel[];
};

const ROOT_DIR = path.resolve(process.cwd(), "..", "..", "..");
const CASE_DIR = path.join(ROOT_DIR, "context-practices", "cases", "neta-studio-continuation-engine");
const FIXTURES_DIR = path.join(CASE_DIR, "fixtures");
const ENGINE_ENTRY = path.join(ROOT_DIR, "context-engine", "dist", "index.js");
const STUDIO_API_BASE = "https://studio.neta.art/api";

const FIXTURE_DEFS = [
  {
    id: "first-pass",
    label: "Round 1",
    description: "第一次生成后，围绕当前对象给出 1-3 个 continuation offers。",
    fileName: "studio-world-snapshot.json",
  },
  {
    id: "after-followup",
    label: "Round 2",
    description: "已经 continuation 一次后，验证 offer 会不会转向更高后果的下一步。",
    fileName: "studio-world-snapshot-after-continuation.json",
  },
] as const;

const readJson = <T>(filePath: string): T => JSON.parse(readFileSync(filePath, "utf8")) as T;

type StudioWorldSummary = {
  id: string;
  config?: {
    name?: string | null;
  } | null;
  atomCount?: number | null;
  workCount?: number | null;
  updatedAt?: number | null;
};

type StudioWorldApiSnapshot = {
  id: string;
  config?: {
    name?: string | null;
    genre?: string | null;
    tone?: string | null;
    era?: string | null;
    rules?: string[] | null;
    overview?: string | null;
    coreConflict?: string | null;
    language?: "zh" | "en" | null;
  } | null;
  atoms?: Array<{
    id: string;
    type?: string | null;
    name?: string | null;
    description?: string | null;
    tags?: string[] | null;
    createdAt?: number | null;
    updatedAt?: number | null;
  }> | null;
  works?: Array<{
    id: string;
    title?: string | null;
    content?: string | null;
    atomIds?: string[] | null;
    createdAt?: number | null;
  }> | null;
};

type StudioChatSessionPayload = {
  sessions: Array<{
    id: string;
    title: string;
    chatMessages: Array<
      | { kind: "user"; content: string }
      | { kind: "agent"; content: string }
      | { kind: "tool_call"; toolName: string; params: unknown }
      | { kind: "tool_result"; toolName: string; result: unknown }
      | { kind: "suggestions"; items: string[] }
    >;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    createdAt: number;
    updatedAt: number;
  }>;
  activeSessionId: string;
  intent: string;
  historyOpen: boolean;
  collapsed: boolean;
  categoryCollapsed?: boolean;
};

let engineModulePromise: Promise<EngineModule> | null = null;

const loadEngineModule = async (): Promise<EngineModule> => {
  if (!engineModulePromise) {
    engineModulePromise = import(
      /* webpackIgnore: true */ pathToFileURL(ENGINE_ENTRY).href
    ) as Promise<EngineModule>;
  }
  return engineModulePromise;
};

const requestStudioJson = async <T>(pathName: string): Promise<T> => {
  const response = await fetch(`${STUDIO_API_BASE}${pathName}`, {
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw new Error(`Failed to load studio data: ${response.status} ${pathName}`);
  }
  return (await response.json()) as T;
};

const buildFixtureViewModel = (
  fixture: {
    id: string;
    label: string;
    description: string;
  },
  snapshot: StudioWorldSnapshot,
  engine: EngineModule,
): ContinuationFixtureViewModel => {
  const context = engine.assembleNetaStudioContext(snapshot);
  const candidates = engine.deriveNetaStudioContinuationCandidates(context);
  const offers = engine.rankNetaStudioContinuationOffers(context, candidates);
  const topCandidate = candidates.find((candidate) => candidate.id === offers[0]?.candidateId);
  const request =
    topCandidate && offers[0]
      ? engine.composeNetaStudioContinuationRequest(context, offers[0], topCandidate)
      : null;

  return {
    id: fixture.id,
    label: fixture.label,
    description: fixture.description,
    snapshot,
    context,
    candidates,
    offers,
    request,
  };
};

export async function loadNetaStudioContinuationPlaygroundData(
  worldId?: string | null,
): Promise<ContinuationPlaygroundData> {
  const engine = await loadEngineModule();
  const worldList = await requestStudioJson<StudioWorldSummary[]>("/worlds");
  const suggestedWorlds = worldList.slice(0, 8).map((world) => ({
    id: world.id,
    name: world.config?.name?.trim() || world.id,
    atomCount: world.atomCount ?? 0,
    workCount: world.workCount ?? 0,
    updatedAt: world.updatedAt ?? 0,
  }));

  if (worldId) {
    const liveSnapshot = await requestStudioJson<StudioWorldApiSnapshot>(
      `/worlds/${encodeURIComponent(worldId)}`,
    );
    const liveChatSession = await requestStudioJson<{
      session: StudioChatSessionPayload | null;
      updatedAt: number | null;
    }>(`/worlds/${encodeURIComponent(worldId)}/chat-session`);
    const snapshot = engine.adaptNetaStudioRuntimeInput({
      snapshot: liveSnapshot,
      chatSession: liveChatSession.session,
    });
    const fixture = buildFixtureViewModel(
      {
        id: "live-world",
        label: "Live world",
        description: "直接从公开 neta-studio world snapshot 组装出的 continuation playground。",
      },
      snapshot,
      engine,
    );

    return {
      caseSlug: "neta-studio-continuation-engine",
      title: "Neta Studio Continuation Engine",
      summary:
        "Live playground mode using a public neta-studio world snapshot as the real upstream input for continuation derivation.",
      mode: "live",
      activeWorldId: snapshot.worldId,
      suggestedWorlds,
      fixtures: [fixture],
    };
  }

  const fixtures = FIXTURE_DEFS.map((fixture) => {
    const snapshot = readJson<StudioWorldSnapshot>(path.join(FIXTURES_DIR, fixture.fileName));
    return buildFixtureViewModel(fixture, snapshot, engine);
  });

  return {
    caseSlug: "neta-studio-continuation-engine",
    title: "Neta Studio Continuation Engine",
    summary:
      "Fixture-backed playground for validating whether a reusable context-engine can derive continuation candidates, rank offers, and compose execution requests from neta-studio world state.",
    mode: "fixture",
    activeWorldId: null,
    suggestedWorlds,
    fixtures,
  };
}
