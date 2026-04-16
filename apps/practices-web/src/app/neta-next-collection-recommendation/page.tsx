import { NetaRecommendationDemo } from "@/components/neta-recommendation-demo";
import { loadNetaRecommendationCaseData } from "@/lib/neta-next-collection";

export default function NetaNextCollectionRecommendationPage() {
  const data = loadNetaRecommendationCaseData();
  return (
    <NetaRecommendationDemo
      current={data.current}
      normalized={data.normalized}
      recommendation={data.recommendation}
    />
  );
}
