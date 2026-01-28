/**
 * Utility for fetching company logos based on company names.
 * Uses Google Favicon API with domain inference and fallback mappings.
 */

// Map common company/organization names to their domains
const COMPANY_DOMAIN_MAP: Record<string, string> = {
  // Universities
  "duke": "duke.edu",
  "duke university": "duke.edu",
  "duke clinical research institute": "duke.edu",
  "stanford": "stanford.edu",
  "stanford university": "stanford.edu",
  "mit": "mit.edu",
  "massachusetts institute of technology": "mit.edu",
  "harvard": "harvard.edu",
  "harvard university": "harvard.edu",
  "yale": "yale.edu",
  "yale university": "yale.edu",
  "princeton": "princeton.edu",
  "princeton university": "princeton.edu",
  "columbia": "columbia.edu",
  "columbia university": "columbia.edu",
  "berkeley": "berkeley.edu",
  "uc berkeley": "berkeley.edu",
  "ucla": "ucla.edu",
  "caltech": "caltech.edu",
  "carnegie mellon": "cmu.edu",
  "cornell": "cornell.edu",
  "northwestern": "northwestern.edu",
  "upenn": "upenn.edu",
  "university of pennsylvania": "upenn.edu",
  "johns hopkins": "jhu.edu",
  "georgia tech": "gatech.edu",
  "usc": "usc.edu",
  "nyu": "nyu.edu",
  "boston university": "bu.edu",
  "umich": "umich.edu",
  "university of michigan": "umich.edu",
  
  // Tech Companies
  "google": "google.com",
  "microsoft": "microsoft.com",
  "apple": "apple.com",
  "amazon": "amazon.com",
  "meta": "meta.com",
  "facebook": "facebook.com",
  "nvidia": "nvidia.com",
  "intel": "intel.com",
  "ibm": "ibm.com",
  "salesforce": "salesforce.com",
  "adobe": "adobe.com",
  "netflix": "netflix.com",
  "spotify": "spotify.com",
  "twitter": "twitter.com",
  "linkedin": "linkedin.com",
  "uber": "uber.com",
  "airbnb": "airbnb.com",
  "stripe": "stripe.com",
  "openai": "openai.com",
  "anthropic": "anthropic.com",
  
  // Organizations
  "girls who code": "girlswhocode.com",
  "code.org": "code.org",
  "khan academy": "khanacademy.org",
  "nasa": "nasa.gov",
  "national institutes of health": "nih.gov",
  "nih": "nih.gov",
  "cdc": "cdc.gov",
  "world health organization": "who.int",
  "united nations": "un.org",
  "red cross": "redcross.org",
  "ymca": "ymca.org",
  "boys & girls clubs": "bgca.org",
  "girl scouts": "girlscouts.org",
  "boy scouts": "scouting.org",
  
  // Research & Education
  "coursera": "coursera.org",
  "edx": "edx.org",
  "udacity": "udacity.com",
  "codecademy": "codecademy.com",
  "brilliant": "brilliant.org",
  "veritas ai": "veritasai.com",
  "pioneer academics": "pioneeracademics.com",
  "ai for good": "ai4good.org",
  "afterschool": "afterschool.org",
}

/**
 * Attempts to extract a domain from a company name
 */
function inferDomainFromName(companyName: string): string | null {
  // Clean up the name
  const cleaned = companyName
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/\s+(inc|llc|ltd|corp|corporation|co|company)\.?$/i, "")
    .trim()
  
  // Check if it already looks like a domain
  if (cleaned.includes(".")) {
    return cleaned
  }
  
  // Check our mapping first
  const directMatch = COMPANY_DOMAIN_MAP[cleaned]
  if (directMatch) return directMatch
  
  // Try partial matches (e.g., "Duke Research" should match "duke")
  for (const [key, domain] of Object.entries(COMPANY_DOMAIN_MAP)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return domain
    }
  }
  
  // Try to create a domain from the company name
  // e.g., "Acme Industries" -> "acmeindustries.com"
  const simplified = cleaned
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 30)
  
  if (simplified.length >= 3) {
    return `${simplified}.com`
  }
  
  return null
}

/**
 * Gets a logo URL for a company using Google Favicon API at maximum resolution
 * @param companyName - The name of the company
 * @returns URL string for the logo, or null if unable to determine
 */
export function getCompanyLogoUrl(companyName: string): string | null {
  if (!companyName) return null
  
  const domain = inferDomainFromName(companyName)
  if (!domain) return null
  
  // Use Google's Favicon service at max size (256px) for best quality
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`
}

/**
 * Gets multiple potential logo sources for fallback
 * @param companyName - The name of the company
 * @returns Array of potential logo URLs
 */
export function getCompanyLogoUrls(companyName: string): string[] {
  if (!companyName) return []
  
  const domain = inferDomainFromName(companyName)
  if (!domain) return []
  
  return [
    // Google Favicon (most reliable)
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    // Clearbit (higher quality when available)
    `https://logo.clearbit.com/${encodeURIComponent(domain)}`,
    // DuckDuckGo icons
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
  ]
}
