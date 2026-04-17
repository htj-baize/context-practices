import { NetaRecommendationDemo } from "@/components/neta-recommendation-demo";
import { loadNetaRecommendationCaseData } from "@/lib/neta-next-collection";
import { getInitialNetaRecommendationBootstrap } from "@/lib/server/neta-recommendation-service";

export const dynamic = "force-dynamic";

export default async function NetaNextCollectionRecommendationPage() {
  const data = await getInitialNetaRecommendationBootstrap({
    currentSource: "liked",
  }).catch(() => loadNetaRecommendationCaseData());
  return (
    <NetaRecommendationDemo
      current={data.current}
      normalized={data.normalized}
      recommendation={data.recommendation}
    />
  );
}
