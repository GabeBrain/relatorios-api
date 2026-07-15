import { useQuery } from '@tanstack/react-query';
import { loadOpenAPIDocuments, type OpenAPIDocument } from '@/lib/openapi-engine';

async function fetchSpecs(): Promise<OpenAPIDocument[]> {
  const files = [
    { filename: 'api-geobrain.json', url: new URL('../assets/openapi/api-geobrain.json', import.meta.url).href },
    { filename: 'api-socio.json', url: new URL('../assets/openapi/api-socio.json', import.meta.url).href },
  ];

  const specs = await Promise.all(
    files.map(async ({ filename, url }) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const raw = await res.json();
        return { filename, raw };
      } catch {
        return null;
      }
    })
  );

  return loadOpenAPIDocuments(specs.filter(Boolean) as Array<{ filename: string; raw: Record<string, unknown> }>);
}

export function useOpenAPIDocs() {
  return useQuery<OpenAPIDocument[]>({
    queryKey: ['openapi-docs'],
    queryFn: fetchSpecs,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
