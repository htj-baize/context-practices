import { NextResponse } from "next/server";
import {
  commitLiveNetaCommunityLike,
  type NetaCommunityLikeRequest,
} from "@/lib/server/neta-recommendation-service";

export const dynamic = "force-dynamic";

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

export async function POST(request: Request) {
  try {
    const requestPayload = (await request.json()) as NetaCommunityLikeRequest;
    const response = await commitLiveNetaCommunityLike(requestPayload);
    const payload: ApiEnvelope<typeof response> = {
      code: 0,
      message: "ok",
      data: response,
    };
    return NextResponse.json(payload);
  } catch (error) {
    const payload: ApiEnvelope<null> = {
      code: 1,
      message: error instanceof Error ? error.message : "Unknown community like error",
      data: null,
    };
    return NextResponse.json(payload, { status: 500 });
  }
}
