import { NetaRecommendationUnifiedDemo } from "@/components/neta-recommendation-unified-demo";
import { loadNetaRecommendationCaseData } from "@/lib/neta-next-collection";
import { getInitialNetaRecommendationBootstrap } from "@/lib/server/neta-recommendation-service";

export const dynamic = "force-dynamic";

export default async function NetaNextCollectionRecommendationUnifiedPage() {
  const data = await getInitialNetaRecommendationBootstrap({
    currentSource: "liked",
  }).catch(() => loadNetaRecommendationCaseData());

  return (
    <NetaRecommendationUnifiedDemo
      current={data.current}
      normalized={data.normalized}
      recommendation={data.recommendation}
    />
  );
}
