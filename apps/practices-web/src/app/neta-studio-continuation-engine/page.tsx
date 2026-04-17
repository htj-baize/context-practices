import { NetaStudioContinuationPlayground } from "@/components/neta-studio-continuation-playground";
import { loadNetaStudioContinuationPlaygroundData } from "@/lib/server/neta-studio-continuation-playground";

type PageProps = {
  searchParams?: Promise<{
    worldId?: string;
  }>;
};

export default async function NetaStudioContinuationEnginePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const data = await loadNetaStudioContinuationPlaygroundData(resolvedSearchParams?.worldId ?? null);

  return <NetaStudioContinuationPlayground data={data} />;
}
