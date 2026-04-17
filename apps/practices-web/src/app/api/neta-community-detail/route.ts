import { NextResponse } from "next/server";
import {
  getLiveNetaCommunityDetail,
  type NetaCommunityDetailRequest,
} from "@/lib/server/neta-recommendation-service";

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

export async function POST(request: Request) {
  try {
    const requestPayload = (await request.json()) as NetaCommunityDetailRequest;
    const response = await getLiveNetaCommunityDetail(requestPayload);
    const payload: ApiEnvelope<typeof response> = {
      code: 0,
      message: "ok",
      data: response,
    };
    return NextResponse.json(payload);
  } catch (error) {
    const payload: ApiEnvelope<null> = {
      code: 1,
      message: error instanceof Error ? error.message : "Unknown community detail error",
      data: null,
    };
    return NextResponse.json(payload, { status: 500 });
  }
}
