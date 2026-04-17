import { NextResponse } from "next/server";
import {
  getLiveNetaRecommendationSession,
  type NetaSessionRequest,
} from "@/lib/server/neta-recommendation-service";

export const dynamic = "force-dynamic";

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

export async function POST(request: Request) {
  const requestId = `api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const requestPayload = (await request.json()) as NetaSessionRequest;
    console.info("[neta-next-api] request start", {
      requestId,
      currentCollectionUuid: requestPayload.currentCollectionUuid ?? "",
      currentSource: requestPayload.currentSource ?? "",
      likedCount: requestPayload.likedCollectionUuids?.length ?? 0,
      dismissedCount: requestPayload.dismissedCollectionUuids?.length ?? 0,
      seenCount: requestPayload.seenCollectionUuids?.length ?? 0,
    });
    const response = await getLiveNetaRecommendationSession(requestPayload);
    console.info("[neta-next-api] request success", {
      requestId,
      currentUuid: response.current.uuid,
      recommendedUuid: response.recommendation.recommended_collection_uuid,
      candidateCount: response.normalized.candidate_count,
    });
    const payload: ApiEnvelope<typeof response> = {
      code: 0,
      message: "ok",
      data: response,
    };
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown recommendation error";
    console.error("[neta-next-api] request failed", {
      requestId,
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    const payload: ApiEnvelope<null> = {
      code: 1,
      message,
      data: null,
    };
    return NextResponse.json(
      payload,
      { status: 500 }
    );
  }
}
