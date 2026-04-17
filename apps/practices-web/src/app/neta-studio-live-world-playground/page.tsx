import { NetaStudioContinuationPlayground } from "@/components/neta-studio-continuation-playground";
import { loadNetaStudioLiveWorldPlaygroundData } from "@/lib/server/neta-studio-continuation-playground";

type PageProps = {
  searchParams?: Promise<{
    worldId?: string;
  }>;
};

export default async function NetaStudioLiveWorldPlaygroundPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const data = await loadNetaStudioLiveWorldPlaygroundData(resolvedSearchParams?.worldId ?? null);

  return <NetaStudioContinuationPlayground data={data} />;
}
