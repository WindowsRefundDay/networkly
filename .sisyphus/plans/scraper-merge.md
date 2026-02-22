# Unified Scraper System Merge

## TL;DR

> **Quick Summary**: Merge ec-scraper's superior AI components (query generator, semantic filter, extractor, hybrid crawler) into Networkly-scrape's FastAPI/SSE framework to create a single, Cloud Run-deployable discovery service.
> 
> **Deliverables**:
> - Unified FastAPI service with SSE streaming
> - Multi-stage Dockerfile for Cloud Run
> - Ported ec-scraper components (query gen, semantic filter, extractor, crawler, profiles)
> - Updated requirements.txt with merged dependencies
> - Cloud Run deployment script
> 
> **Estimated Effort**: Large (3-5 days)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 (Foundation) -> Task 2 (LLM Provider) -> Task 5 (Query Gen) -> Task 8 (Integration) -> Task 11 (Dockerfile)

---

## Context

### Original Request
Merge two parallel Python scraper systems into ONE unified system in Networkly-scrape:
- One Docker container
- One FastAPI service
- Best components from both systems
- Easy Google Cloud Run deployment

### Interview Summary
**Key Discussions**:
- ec-scraper has superior Query Generator (6 categories, profile-aware)
- ec-scraper's Semantic Filter with golden reference is more sophisticated
- ec-scraper's Discovery Profiles (quick/daily) are useful
- Networkly-scrape's FastAPI/SSE streaming should be the base
- Both use SearXNG, only need one client
- Single Dockerfile for Cloud Run (no docker-compose)

**Research Findings**:
- Cloud Run fully supports SSE with `--timeout=3600`
- Recommended config: python:3.11-slim, 2Gi memory, 2 CPU, concurrency 10
- External SearXNG recommended over sidecar
- Use Secret Manager for credentials
- Multi-stage Dockerfile reduces image size ~60%

### Gap Analysis
**Identified Gaps** (addressed):
- Dependency conflict (google-genai vs google-cloud-aiplatform): Use google-genai unified SDK
- Model schema differences: Port ec-scraper's OpportunityCard model
- Crawler complexity: Accept larger image for better scraping quality
- Missing batch endpoint: Include both quick and daily discovery routes

---

## Work Objectives

### Core Objective
Create a single, production-ready FastAPI scraper service that combines the best AI components from ec-scraper with the robust streaming infrastructure of Networkly-scrape, deployable to Google Cloud Run.

### Concrete Deliverables
- `Networkly-scrape/app/` - Unified FastAPI application with merged components
- `Networkly-scrape/Dockerfile` - Multi-stage, Cloud Run-ready Dockerfile
- `Networkly-scrape/requirements.txt` - Merged Python dependencies
- `Networkly-scrape/deploy.sh` - Cloud Run deployment script

### Definition of Done
- [ ] `curl http://localhost:8080/health` returns 200 OK
- [ ] SSE endpoint `/discover/stream?query=test` streams discovery events
- [ ] Daily batch endpoint `/discover/daily` works with rate limiting
- [ ] Docker image builds under 2GB
- [ ] Cloud Run deploys successfully with `gcloud run deploy`

### Must Have
- Query Generator with 6 category templates (from ec-scraper)
- Semantic Filter with golden reference and batch embeddings
- Hybrid Crawler with Scrapy + Crawl4AI fallback
- Discovery Profiles (quick/daily modes)
- SSE streaming with layer-based events
- Supabase integration for storage + vector search
- Single Dockerfile for Cloud Run
- Health check endpoint `/health`

### Must NOT Have (Guardrails)
- NO docker-compose for production (Cloud Run is single container)
- NO ChromaDB (use Supabase vectors only)
- NO sidecar SearXNG (use external instance)
- NO hardcoded credentials (use environment variables or Secret Manager)
- NO local SQLite database (use Supabase for all storage)
- NO separate services (ONE FastAPI service)
- DO NOT modify ec-scraper original files (port, don't edit in place)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (Networkly-scrape has minimal tests)
- **User wants tests**: NO (manual verification for fastest iteration)
- **Framework**: None initially, manual verification via SSE endpoint
- **QA approach**: Manual verification with curl/httpx + browser SSE client

### Automated Verification Approach

Each TODO includes executable verification that agents can run directly via:
- **API endpoints**: curl commands with expected JSON responses
- **SSE streaming**: httpx streaming client or browser DevTools
- **Docker**: `docker build` and `docker run` commands
- **Import checks**: `python -c "from app.X import Y; print('OK')"`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately) - Foundation:
├── Task 1: Port models and config from ec-scraper
├── Task 2: Port LLM provider abstraction
└── Task 3: Update requirements.txt with merged deps

Wave 2 (After Wave 1) - Core Components:
├── Task 4: Port Semantic Filter
├── Task 5: Port Query Generator  
├── Task 6: Port Hybrid Crawler
└── Task 7: Port Extractor Agent

Wave 3 (After Wave 2) - Integration:
├── Task 8: Refactor discovery router with new components
└── Task 9: Add daily batch discovery endpoint

Wave 4 (After Wave 3) - Deployment:
├── Task 10: Create multi-stage Dockerfile
├── Task 11: Create Cloud Run deploy script
└── Task 12: Final integration test

Critical Path: Task 1 → Task 2 → Task 5 → Task 8 → Task 10
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 5, 6, 7 | 2, 3 |
| 2 | None | 4, 5, 7 | 1, 3 |
| 3 | None | 10 | 1, 2 |
| 4 | 1, 2 | 8 | 5, 6, 7 |
| 5 | 1, 2 | 8 | 4, 6, 7 |
| 6 | 1 | 8 | 4, 5, 7 |
| 7 | 1, 2 | 8 | 4, 5, 6 |
| 8 | 4, 5, 6, 7 | 9, 12 | None |
| 9 | 8 | 12 | 10, 11 |
| 10 | 3 | 12 | 9, 11 |
| 11 | None | 12 | 9, 10 |
| 12 | 8, 9, 10 | None | None (final) |

---

## TODOs

### Wave 1: Foundation

- [ ] 1. Port models and config from ec-scraper

  **What to do**:
  - Create `app/core/` directory for shared infrastructure
  - Port `ec-scraper/src/db/models.py` → `app/core/models.py`
  - Port `ec-scraper/src/config/settings.py` → `app/core/config.py`
  - Port `ec-scraper/src/config/blocklists.py` → `app/core/blocklists.py`
  - Adapt Pydantic Settings for FastAPI pattern
  - Remove SQLite/ChromaDB references (use Supabase only)
  - Keep Discovery Profiles (QUICK_PROFILE, DAILY_PROFILE)

  **Must NOT do**:
  - Do not keep SQLite path config
  - Do not keep ChromaDB path config
  - Do not modify original ec-scraper files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed
  - Reason: File porting with minimal logic changes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 6, 7
  - **Blocked By**: None

  **References**:
  - `ec-scraper/src/db/models.py` - OpportunityCard, ExtractionResponse, all enums
  - `ec-scraper/src/config/settings.py:12-58` - DiscoveryProfile dataclass, QUICK_PROFILE, DAILY_PROFILE
  - `ec-scraper/src/config/blocklists.py` - BLOCKED_DOMAINS, JS_HEAVY_DOMAINS functions
  - `Networkly-scrape/app/config.py` - Existing config pattern to follow

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  python -c "from app.core.models import OpportunityCard, OpportunityCategory; print('OK')"
  # Assert: Output is "OK"
  
  python -c "from app.core.config import get_settings, get_discovery_profile; print(get_discovery_profile('quick').name)"
  # Assert: Output is "quick"
  
  python -c "from app.core.blocklists import is_blocked_domain; print(is_blocked_domain('reddit.com'))"
  # Assert: Output is "True"
  ```

  **Commit**: YES
  - Message: `feat(core): port models and config from ec-scraper`
  - Files: `app/core/__init__.py`, `app/core/models.py`, `app/core/config.py`, `app/core/blocklists.py`

---

- [ ] 2. Port LLM provider abstraction

  **What to do**:
  - Create `app/core/llm/` directory
  - Port `ec-scraper/src/llm/provider.py` → `app/core/llm/provider.py`
  - Port `ec-scraper/src/llm/gemini_provider.py` → `app/core/llm/gemini_provider.py`
  - Ensure Vertex AI mode works (USE_VERTEX_AI=true)
  - Ensure API key mode works as fallback
  - Port GenerationConfig dataclass
  - Include generate() and generate_structured() methods

  **Must NOT do**:
  - Do not use google-cloud-aiplatform (stick with google-genai SDK)
  - Do not remove Vertex AI support

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed
  - Reason: Direct file porting

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 5, 7
  - **Blocked By**: None

  **References**:
  - `ec-scraper/src/llm/provider.py` - Abstract provider interface
  - `ec-scraper/src/llm/gemini_provider.py` - GeminiProvider with Vertex AI support
  - `ec-scraper/src/llm/__init__.py` - get_llm_provider() singleton
  - `Networkly-scrape/app/services/vertex_ai.py` - Current implementation to replace

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  python -c "from app.core.llm import get_llm_provider, GenerationConfig; print('OK')"
  # Assert: Output is "OK"
  
  # Note: Full provider test requires API credentials
  python -c "from app.core.llm.gemini_provider import GeminiProvider; print('Provider class exists')"
  # Assert: Output is "Provider class exists"
  ```

  **Commit**: YES
  - Message: `feat(llm): port LLM provider abstraction from ec-scraper`
  - Files: `app/core/llm/__init__.py`, `app/core/llm/provider.py`, `app/core/llm/gemini_provider.py`

---

- [ ] 3. Update requirements.txt with merged dependencies

  **What to do**:
  - Merge dependencies from both projects
  - Remove duplicates, keep newer versions
  - Add ec-scraper dependencies: `crawl4ai`, `scrapy`, `google-genai`, `markdownify`
  - Keep Networkly-scrape dependencies: `fastapi`, `uvicorn`, `supabase`, `httpx`
  - Remove conflicting: `google-cloud-aiplatform` (use google-genai instead)
  - Add `sse-starlette` for better SSE support
  - Pin versions for reproducibility

  **Must NOT do**:
  - Do not include chromadb (using Supabase vectors)
  - Do not include aiosqlite (using Supabase)
  - Do not include langgraph (not needed for merged system)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed
  - Reason: Simple file editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:
  - `ec-scraper/pyproject.toml` - Source dependencies
  - `Networkly-scrape/requirements.txt` - Target file to update

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  pip install -r requirements.txt --dry-run 2>&1 | head -20
  # Assert: No dependency conflicts reported
  
  grep -c "google-genai" requirements.txt
  # Assert: Output is "1" (included)
  
  grep -c "chromadb" requirements.txt
  # Assert: Output is "0" (not included)
  ```

  **Commit**: YES
  - Message: `chore(deps): merge dependencies from ec-scraper`
  - Files: `requirements.txt`

---

### Wave 2: Core Components

- [ ] 4. Port Semantic Filter with golden reference

  **What to do**:
  - Create `app/services/semantic_filter.py`
  - Port `ec-scraper/src/search/semantic_filter.py`
  - Include REFERENCE_TEXT (golden reference)
  - Include GUIDE_HINTS, PREFILTER_URL_HINTS, PREFILTER_TEXT_HINTS
  - Include batch embedding with text-embedding-004
  - Include guide_penalty and cosine_similarity_batch
  - Adapt to use ported LLM provider for embeddings
  - Update imports to use `app.core.config`

  **Must NOT do**:
  - Do not change the REFERENCE_TEXT content
  - Do not change the similarity algorithm
  - Do not use different embedding model

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed
  - Reason: File porting with import updates

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `ec-scraper/src/search/semantic_filter.py:1-305` - Full file to port
  - `ec-scraper/src/utils/retry.py` - EMBEDDING_RETRY_CONFIG pattern
  - `app/core/config.py` - New config module (from Task 1)

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  python -c "from app.services.semantic_filter import SemanticFilter, REFERENCE_TEXT; print(len(REFERENCE_TEXT) > 100)"
  # Assert: Output is "True"
  
  python -c "from app.services.semantic_filter import get_semantic_filter; sf = get_semantic_filter(0.5); print(sf.threshold)"
  # Assert: Output is "0.5"
  ```

  **Commit**: YES
  - Message: `feat(filter): port semantic filter with golden reference`
  - Files: `app/services/semantic_filter.py`, `app/utils/retry.py`

---

- [ ] 5. Port Query Generator with category templates

  **What to do**:
  - Create `app/services/query_generator.py`
  - Port `ec-scraper/src/agents/query_generator.py`
  - Include QUERY_GENERATION_PROMPT
  - Include all CATEGORY_TEMPLATES (competitions, internships, summer_programs, etc.)
  - Include HIGH_SIGNAL_TEMPLATES
  - Include PROFILE_INTEREST_TEMPLATES, PROFILE_LOCATION_TEMPLATES
  - Include near-duplicate detection (_is_near_duplicate, _dedupe_queries)
  - Include category coverage logic
  - Update imports to use `app.core.llm`

  **Must NOT do**:
  - Do not simplify the prompt
  - Do not remove category templates
  - Do not remove deduplication logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed
  - Reason: File porting with import updates

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `ec-scraper/src/agents/query_generator.py:1-393` - Full file to port
  - `ec-scraper/src/utils/json_parser.py` - safe_json_loads utility
  - `app/core/llm/__init__.py` - get_llm_provider (from Task 2)

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  python -c "from app.services.query_generator import CATEGORY_TEMPLATES; print(len(CATEGORY_TEMPLATES.keys()))"
  # Assert: Output is "7" (6 categories + general)
  
  python -c "from app.services.query_generator import get_query_generator; qg = get_query_generator(); print(type(qg).__name__)"
  # Assert: Output is "QueryGenerator"
  ```

  **Commit**: YES
  - Message: `feat(query): port query generator with category templates`
  - Files: `app/services/query_generator.py`, `app/utils/json_parser.py`

---

- [ ] 6. Port Hybrid Crawler (Scrapy + Crawl4AI)

  **What to do**:
  - Create `app/services/crawlers/` directory
  - Port `ec-scraper/src/crawlers/hybrid_crawler.py` → `app/services/crawlers/hybrid_crawler.py`
  - Port `ec-scraper/src/crawlers/scrapy_spider.py` → `app/services/crawlers/scrapy_spider.py`
  - Port `ec-scraper/src/crawlers/crawl4ai_client.py` → `app/services/crawlers/crawl4ai_client.py`
  - Include CrawlResult dataclass
  - Include routing logic (is_js_heavy_domain)
  - Include retry logic with centralized config
  - Update imports to use `app.core.config`, `app.core.blocklists`

  **Must NOT do**:
  - Do not remove Scrapy (it's 5-10x faster)
  - Do not remove Crawl4AI fallback (needed for JS sites)
  - Do not change routing logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed
  - Reason: File porting with directory structure

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:
  - `ec-scraper/src/crawlers/hybrid_crawler.py:1-212` - Main crawler logic
  - `ec-scraper/src/crawlers/scrapy_spider.py` - ScrapyRunner subprocess wrapper
  - `ec-scraper/src/crawlers/crawl4ai_client.py` - Crawl4AI async wrapper
  - `app/core/blocklists.py` - is_blocked_domain, is_js_heavy_domain (from Task 1)

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  python -c "from app.services.crawlers import get_hybrid_crawler, CrawlResult; print('OK')"
  # Assert: Output is "OK"
  
  python -c "from app.services.crawlers.hybrid_crawler import HybridCrawler; hc = HybridCrawler(); print(hc._crawl_timeout > 0)"
  # Assert: Output is "True"
  ```

  **Commit**: YES
  - Message: `feat(crawler): port hybrid crawler with Scrapy + Crawl4AI`
  - Files: `app/services/crawlers/__init__.py`, `app/services/crawlers/hybrid_crawler.py`, `app/services/crawlers/scrapy_spider.py`, `app/services/crawlers/crawl4ai_client.py`

---

- [ ] 7. Port Extractor Agent with list page support

  **What to do**:
  - Create `app/services/extractor.py`
  - Port `ec-scraper/src/agents/extractor.py`
  - Include EXTRACTION_PROMPT with date extraction instructions
  - Include LIST_PAGE_EXTRACTION_PROMPT
  - Include ExtractorAgent class with both extract() and extract_list()
  - Include _is_likely_guide, _is_likely_list_page heuristics
  - Include _truncate_content with keyword preservation
  - Include MultiExtractionResult for list pages
  - Update imports to use ported components

  **Must NOT do**:
  - Do not simplify the extraction prompts
  - Do not remove list page support
  - Do not remove timing classification logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed
  - Reason: File porting (largest component)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `ec-scraper/src/agents/extractor.py:1-666` - Full extractor to port
  - `app/core/models.py` - OpportunityCard, ExtractionResult (from Task 1)
  - `app/core/llm/__init__.py` - get_llm_provider (from Task 2)

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  python -c "from app.services.extractor import ExtractorAgent, EXTRACTION_PROMPT; print(len(EXTRACTION_PROMPT) > 500)"
  # Assert: Output is "True"
  
  python -c "from app.services.extractor import get_extractor; ext = get_extractor(); print(type(ext).__name__)"
  # Assert: Output is "ExtractorAgent"
  
  python -c "from app.services.extractor import LIST_PAGE_EXTRACTION_PROMPT; print('up to 7' in LIST_PAGE_EXTRACTION_PROMPT)"
  # Assert: Output is "True"
  ```

  **Commit**: YES
  - Message: `feat(extractor): port extractor agent with list page support`
  - Files: `app/services/extractor.py`

---

### Wave 3: Integration

- [ ] 8. Refactor discovery router with new components

  **What to do**:
  - Update `app/routers/discovery.py` to use ported components
  - Replace VertexAIService with QueryGenerator
  - Replace URL evaluator with SemanticFilter
  - Replace WebScraper with HybridCrawler
  - Replace ContentExtractor with ExtractorAgent
  - Keep existing SSE streaming pattern (layer events)
  - Add Discovery Profile support (quick/daily via query param)
  - Update event types to match ec-scraper's emit_event pattern
  - Integrate with existing Supabase service

  **Must NOT do**:
  - Do not change SSE format drastically (frontend depends on it)
  - Do not remove layer-based events
  - Do not change /discover/stream endpoint signature

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: None needed
  - Reason: Core integration requiring understanding of both systems

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 9, 12
  - **Blocked By**: Tasks 4, 5, 6, 7

  **References**:
  - `Networkly-scrape/app/routers/discovery.py:30-191` - Current router to refactor
  - `ec-scraper/scripts/quick_discovery.py` - Pipeline orchestration pattern
  - `app/services/query_generator.py` - QueryGenerator (from Task 5)
  - `app/services/semantic_filter.py` - SemanticFilter (from Task 4)
  - `app/services/crawlers/` - HybridCrawler (from Task 6)
  - `app/services/extractor.py` - ExtractorAgent (from Task 7)
  - `app/services/supabase.py` - Existing Supabase service (keep)

  **Acceptance Criteria**:
  ```bash
  # Agent starts server then runs:
  # Start: uvicorn app.main:app --port 8080 &
  
  curl -s "http://localhost:8080/health" | jq '.status'
  # Assert: Output is "healthy"
  
  # SSE streaming test (first 5 events):
  timeout 30 curl -s -N "http://localhost:8080/discover/stream?query=robotics" | head -20
  # Assert: Contains "event: layer_start"
  # Assert: Contains "event: plan" or "event: query_generation"
  ```

  **Commit**: YES
  - Message: `refactor(discovery): integrate ported ec-scraper components`
  - Files: `app/routers/discovery.py`

---

- [ ] 9. Add daily batch discovery endpoint

  **What to do**:
  - Add `/discover/daily` POST endpoint to discovery router
  - Use DAILY_PROFILE config (stricter thresholds, more URLs)
  - Accept request body: `{ focus_areas: [], limit: 100, sources: [] }`
  - Run discovery in background with progress tracking
  - Store results to Supabase
  - Return job ID and status endpoint

  **Must NOT do**:
  - Do not block the HTTP request (run async)
  - Do not skip semantic filtering for batch mode

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed
  - Reason: Adding endpoint following existing patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5 (with Tasks 10, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Task 8

  **References**:
  - `ec-scraper/src/api/server.py` - /discover/daily endpoint pattern
  - `ec-scraper/scripts/batch_discovery.py` - Batch discovery logic
  - `app/core/config.py` - DAILY_PROFILE (from Task 1)
  - `app/routers/discovery.py` - Existing router (from Task 8)

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  curl -s -X POST "http://localhost:8080/discover/daily" \
    -H "Content-Type: application/json" \
    -d '{"focus_areas": ["STEM"], "limit": 10}' | jq '.job_id'
  # Assert: Returns non-null job_id
  ```

  **Commit**: YES
  - Message: `feat(discovery): add daily batch discovery endpoint`
  - Files: `app/routers/discovery.py`

---

### Wave 4: Deployment

- [ ] 10. Create multi-stage Dockerfile for Cloud Run

  **What to do**:
  - Create new `Dockerfile` with multi-stage build
  - Stage 1 (builder): Install build dependencies, pip packages
  - Stage 2 (runtime): Copy packages, app code, minimal runtime
  - Use `python:3.11-slim` as base
  - Install Playwright for Crawl4AI (optional: add as separate stage)
  - Install Scrapy runtime dependencies
  - Set CMD to use exec form for graceful shutdown
  - Configure for PORT env var (Cloud Run injects)
  - Add non-root user for security
  - Keep image under 2GB

  **Must NOT do**:
  - Do not use docker-compose
  - Do not install SearXNG in container
  - Do not use alpine (compatibility issues)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed
  - Reason: Infrastructure file, follows Cloud Run best practices

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5 (with Tasks 9, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Task 3

  **References**:
  - `Networkly-scrape/Dockerfile` - Current Dockerfile to replace
  - Cloud Run container contract documentation
  - FastAPI Docker deployment guide

  **Acceptance Criteria**:
  ```bash
  # Agent runs:
  docker build -t networkly-scraper:test . 2>&1 | tail -5
  # Assert: Build completes successfully
  
  docker images networkly-scraper:test --format "{{.Size}}"
  # Assert: Size under 2GB
  
  docker run --rm networkly-scraper:test python -c "from app.main import app; print('OK')"
  # Assert: Output contains "OK"
  ```

  **Commit**: YES
  - Message: `build(docker): add multi-stage Dockerfile for Cloud Run`
  - Files: `Dockerfile`

---

- [ ] 11. Create Cloud Run deployment script

  **What to do**:
  - Update `deploy.sh` script
  - Enable required GCP APIs (run.googleapis.com, aiplatform.googleapis.com)
  - Create service account with Vertex AI User role
  - Configure Secret Manager for credentials
  - Deploy with recommended settings: 2Gi memory, 2 CPU, concurrency 10
  - Set timeout to 3600 (max, for SSE)
  - Set min-instances=1 (avoid cold starts)
  - Enable CPU boost for faster startup
  - Output deployed service URL

  **Must NOT do**:
  - Do not hardcode project ID
  - Do not include credentials in script
  - Do not skip Secret Manager setup

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed
  - Reason: Shell script following Cloud Run patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.5 (with Tasks 9, 10)
  - **Blocks**: Task 12
  - **Blocked By**: None

  **References**:
  - `Networkly-scrape/deploy.sh` - Current deploy script to update
  - Cloud Run deployment documentation
  - Secret Manager integration guide

  **Acceptance Criteria**:
  ```bash
  # Agent runs (validation only, not actual deploy):
  bash -n deploy.sh
  # Assert: Exit code 0 (valid syntax)
  
  grep -q "memory=2Gi" deploy.sh
  # Assert: Memory config present
  
  grep -q "timeout=3600" deploy.sh
  # Assert: SSE timeout configured
  ```

  **Commit**: YES
  - Message: `build(deploy): update Cloud Run deployment script`
  - Files: `deploy.sh`

---

- [ ] 12. Final integration test and documentation

  **What to do**:
  - Run full integration test locally
  - Test /health endpoint
  - Test /discover/stream with real query
  - Test /discover/daily endpoint
  - Verify Docker image builds and runs
  - Update README.md with new architecture
  - Document environment variables
  - Document deployment steps
  - Create migration notes from old system

  **Must NOT do**:
  - Do not deploy to production (just verify locally)
  - Do not remove existing README sections about frontend integration

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: None needed
  - Reason: Documentation and verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None (completion)
  - **Blocked By**: Tasks 8, 9, 10

  **References**:
  - `Networkly-scrape/README.md` - Current README to update
  - All ported components for documentation

  **Acceptance Criteria**:
  ```bash
  # Agent runs integration test:
  docker build -t networkly-scraper:final .
  docker run -d --name test-scraper -p 8080:8080 \
    -e SUPABASE_URL=test -e GCP_PROJECT=test \
    networkly-scraper:final
  sleep 5
  
  curl -s "http://localhost:8080/health" | jq '.status'
  # Assert: Output is "healthy"
  
  docker stop test-scraper && docker rm test-scraper
  # Assert: Cleanup successful
  
  grep -q "## Architecture" README.md
  # Assert: Architecture section exists
  ```

  **Commit**: YES
  - Message: `docs(readme): update with unified scraper architecture`
  - Files: `README.md`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(core): port models and config` | app/core/* | python import |
| 2 | `feat(llm): port LLM provider` | app/core/llm/* | python import |
| 3 | `chore(deps): merge dependencies` | requirements.txt | pip dry-run |
| 4 | `feat(filter): port semantic filter` | app/services/semantic_filter.py | python import |
| 5 | `feat(query): port query generator` | app/services/query_generator.py | python import |
| 6 | `feat(crawler): port hybrid crawler` | app/services/crawlers/* | python import |
| 7 | `feat(extractor): port extractor agent` | app/services/extractor.py | python import |
| 8 | `refactor(discovery): integrate components` | app/routers/discovery.py | curl health |
| 9 | `feat(discovery): add daily endpoint` | app/routers/discovery.py | curl POST |
| 10 | `build(docker): multi-stage Dockerfile` | Dockerfile | docker build |
| 11 | `build(deploy): Cloud Run script` | deploy.sh | bash -n |
| 12 | `docs(readme): unified architecture` | README.md | grep check |

---

## Success Criteria

### Verification Commands
```bash
# Health check
curl -s http://localhost:8080/health | jq '.status'
# Expected: "healthy"

# SSE streaming (quick discovery)
timeout 60 curl -N "http://localhost:8080/discover/stream?query=robotics" | head -50
# Expected: Multiple SSE events with layer_start, opportunity_found

# Daily batch (async)
curl -X POST http://localhost:8080/discover/daily \
  -H "Content-Type: application/json" \
  -d '{"focus_areas": ["STEM"], "limit": 5}'
# Expected: {"job_id": "...", "status": "started"}

# Docker build
docker build -t networkly-scraper . && echo "Build OK"
# Expected: "Build OK"
```

### Final Checklist
- [ ] All "Must Have" features present
- [ ] All "Must NOT Have" guardrails respected
- [ ] Docker image under 2GB
- [ ] Cloud Run deploy script validated
- [ ] README updated with new architecture
