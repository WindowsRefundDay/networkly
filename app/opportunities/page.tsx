import OpportunitiesClient from "./opportunities-client"

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>
}) {
  const params = await searchParams
  return <OpportunitiesClient initialHighlightId={params?.highlight ?? null} />
}
