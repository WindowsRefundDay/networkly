import { z } from "zod"

export const DashboardRecommendationSchema = z.object({
  opportunityId: z.string().uuid(),
  title: z.string(),
  organization: z.string(),
  location: z.string().nullable(),
  topMatchProbability: z.number().int().min(0).max(100),
  matchScoreRaw: z.number(),
  matchReasons: z.array(z.string()),
  computedAt: z.string().datetime(),
}).strict()

export const DashboardTelemetryCoreSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    profileCompleteness: z.number().int().min(0).max(100),
    searchAppearancesTotal: z.number().int().nonnegative(),
  }).strict(),
  monumentalMetrics: z.object({
    matches: z.number().int().nonnegative(),
    unreadMessages: z.number().int().nonnegative(),
    pendingRequests: z.number().int().nonnegative(),
  }).strict(),
  weeklyTelemetry: z.object({
    profileViews7d: z.number().int().nonnegative(),
    newConnections7d: z.number().int().nonnegative(),
  }).strict(),
  recommendation: DashboardRecommendationSchema.nullable(),
}).strict()

export const DashboardTelemetryResponseSchema = DashboardTelemetryCoreSchema.extend({
  meta: z.object({
    generatedAt: z.string().datetime(),
    cacheState: z.enum(["fresh", "stale", "bypass"]),
    stale: z.boolean(),
    ttlSeconds: z.literal(60),
  }).strict(),
}).strict()

export type DashboardTelemetryCore = z.infer<typeof DashboardTelemetryCoreSchema>
export type DashboardRecommendation = z.infer<typeof DashboardRecommendationSchema>
export type DashboardTelemetryResponse = z.infer<typeof DashboardTelemetryResponseSchema>
