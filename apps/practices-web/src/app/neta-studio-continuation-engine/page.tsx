import { NetaStudioContinuationPlayground } from "@/components/neta-studio-continuation-playground";
import { loadNetaStudioContinuationPlaygroundData } from "@/lib/server/neta-studio-continuation-playground";

export default async function NetaStudioContinuationEnginePage() {
  const data = await loadNetaStudioContinuationPlaygroundData();

  return <NetaStudioContinuationPlayground data={data} />;
}
