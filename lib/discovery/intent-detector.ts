/**
 * Intent Detection for Discovery System
 *
 * Detects whether a search query is a "pivot" (exploring new field) or
 * "explore" (searching within established interests) based on keyword matching.
 *
 * Zero LLM cost, instant execution (<1ms).
 */

export interface IntentResult {
  intent: 'pivot' | 'explore'
  confidence: number
  matchedInterests: string[]
  personalizationWeight: number
}

/**
 * Detect search intent by comparing query keywords to user interests.
 *
 * @param query - User's search query (e.g., "AI internships")
 * @param userInterests - User's declared interests (e.g., ["AI", "Machine Learning"])
 * @returns Intent classification with confidence score
 *
 * @example
 * ```typescript
 * // User with interests in ["AI", "Biotech"]
 * detectPivotLocally("AI internships", ["AI", "Biotech"])
 * // → { intent: 'explore', confidence: 0.85, matchedInterests: ['AI'], personalizationWeight: 0.9 }
 *
 * detectPivotLocally("Environmental Science programs", ["AI", "Biotech"])
 * // → { intent: 'pivot', confidence: 0.7, matchedInterests: [], personalizationWeight: 0.2 }
 * ```
 */
export function detectPivotLocally(
  query: string,
  userInterests: string[] = []
): IntentResult {
  // Edge case: No interests = assume pivot (broad search)
  if (!userInterests || userInterests.length === 0) {
    return {
      intent: 'pivot',
      confidence: 0,
      matchedInterests: [],
      personalizationWeight: 0.2
    }
  }

  // Extract keywords from query
  const queryTokens = extractKeywords(query)

  if (queryTokens.length === 0) {
    // Empty or invalid query → default to explore
    return {
      intent: 'explore',
      confidence: 0.3,
      matchedInterests: [],
      personalizationWeight: 0.9
    }
  }

  // Find which interests match the query
  const matchedInterests: string[] = []
  const interestScores: number[] = []

  for (const interest of userInterests) {
    const score = calculateSimilarity(interest, queryTokens)
    if (score > 0.65) {
      // Strong match threshold
      matchedInterests.push(interest)
      interestScores.push(score)
    }
  }

  // Calculate match ratio
  const matchRatio = matchedInterests.length / userInterests.length

  // Determine intent
  // If >30% of interests match → EXPLORE (within field)
  // If <30% match → PIVOT (new field)
  const isPivot = matchRatio < 0.3

  // Calculate confidence based on match strength
  let confidence: number
  if (matchedInterests.length === 0) {
    // No matches → high confidence it's a pivot
    confidence = 0.8
  } else if (matchedInterests.length >= Math.ceil(userInterests.length * 0.5)) {
    // >50% interests matched → high confidence it's explore
    confidence = 0.9
  } else {
    // Partial match → moderate confidence
    const avgScore = interestScores.reduce((a, b) => a + b, 0) / interestScores.length
    confidence = avgScore * 0.8
  }

  // Map to personalization weight
  // PIVOT → low weight (0.2) = broad search, prestige ranking
  // EXPLORE → high weight (0.9) = personalized search, profile ranking
  const personalizationWeight = isPivot ? 0.2 : 0.9

  return {
    intent: isPivot ? 'pivot' : 'explore',
    confidence,
    matchedInterests,
    personalizationWeight
  }
}

/**
 * Extract meaningful keywords from query string.
 * Filters out stop words, short tokens, and non-alphabetic characters.
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'what', 'which', 'who', 'when', 'where', 'why', 'how',
    'find', 'search', 'looking', 'want', 'need', 'help', 'show', 'get'
  ])

  return query
    .toLowerCase()
    .split(/[\s\W]+/) // Split on whitespace and non-word chars
    .filter(token =>
      token.length >= 3 &&                    // At least 3 chars
      !stopWords.has(token) &&                // Not a stop word
      /[a-z]/.test(token)                     // Contains letters
    )
}

/**
 * Calculate similarity between an interest and query keywords.
 * Uses substring matching and character overlap.
 *
 * @returns Score from 0.0 (no match) to 1.0 (perfect match)
 */
function calculateSimilarity(interest: string, queryTokens: string[]): number {
  const interestLower = interest.toLowerCase()
  const interestTokens = extractKeywords(interest)

  let maxScore = 0

  // Check each query token against the interest
  for (const queryToken of queryTokens) {
    // Exact match → 1.0
    if (interestLower === queryToken) {
      return 1.0
    }

    // Substring match → 1.0
    if (interestLower.includes(queryToken) || queryToken.includes(interestLower)) {
      maxScore = Math.max(maxScore, 1.0)
      continue
    }

    // Check against interest tokens
    for (const interestToken of interestTokens) {
      if (interestToken === queryToken) {
        maxScore = Math.max(maxScore, 1.0)
      } else if (interestToken.includes(queryToken) || queryToken.includes(interestToken)) {
        maxScore = Math.max(maxScore, 0.9)
      } else {
        // Character overlap score
        const overlap = characterOverlap(interestToken, queryToken)
        maxScore = Math.max(maxScore, overlap)
      }
    }
  }

  return maxScore
}

/**
 * Calculate character overlap between two strings.
 * Simple similarity metric based on shared characters.
 */
function characterOverlap(a: string, b: string): number {
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a

  if (longer.length === 0) return 0

  let matches = 0
  for (const char of shorter) {
    if (longer.includes(char)) matches++
  }

  return matches / longer.length
}
