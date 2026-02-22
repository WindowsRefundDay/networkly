export async function enqueueRecommendationRefresh(userId: string): Promise<void> {
  // Worker integration point. Intentionally fail-open for request path safety.
  console.info("[dashboard:recommendation] enqueue refresh", { userId })
}
