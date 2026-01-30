# Scraper Enhancements: Schema, Cost Flagging, Cleanup, and Raw Signals

## TL;DR

> **Quick Summary**: Add 5 new fields to the opportunity schema, implement $80 cost flagging, fix the broken db_cleanup.py script, and enhance raw signal extraction with meta/OG tags.
> 
> **Deliverables**:
> - New Supabase migration with 5 additional columns
> - Updated Pydantic models in both codebases
> - Cost parsing and flagging logic ($80 threshold)
> - Fixed db_cleanup.py using Supabase client
> - Meta tag extraction before AI processing
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (Migration) -> Task 2 (Models) -> Task 3 (Cost Logic) -> Task 5 (Verify)

---

## Context

### Original Request
User requested implementation of 4 specific scraper improvements from a gap analysis:
- Item 2: Add Missing Schema Fields
- Item 3: Add Cost Flagging Logic
- Item 4: Fix Broken db_cleanup.py
- Item 5: Enhanced Raw Signal Extraction
- (Item 1 - PDF Parsing explicitly SKIPPED)

### Interview Summary
**Key Discussions**:
- Target codebases: BOTH `Networkly-scrape/` AND `ec-scraper/`
- High-cost threshold: $80 (very aggressive, flags most paid programs)
- Database: Create Supabase CLI migrations

**Research Findings**:
- `PostgresSync` has been migrated to Supabase client (no `_pool` attribute)
- `db_cleanup.py` Line 41 references `sync._pool.acquire()` - BROKEN
- Current schema has `cost` as TEXT but no `is_high_cost` boolean
- Raw signal extraction is minimal (title + keyword highlights only)

### Self-Analysis (Metis Unavailable)
**Potential Gaps Identified**:
1. LLM prompt update needed to extract new fields (difficulty_level, commitment_level)
2. Need to handle currency parsing edge cases ($, USD, "Free", "TBD")
3. Sync both codebases - models must stay in sync

---

## Work Objectives

### Core Objective
Enhance the scraper's data quality by adding granular classification fields, implementing cost-based safety flagging, fixing broken maintenance scripts, and extracting more signals before AI processing.

### Concrete Deliverables
1. `Networkly-scrape/supabase/migrations/20260128000000_add_scraper_fields.sql` - New migration
2. Updated `ExtractionResponse` models in both codebases
3. Cost parsing logic with $80 threshold in both extractors
4. Fixed `ec-scraper/scripts/db_cleanup.py`
5. Meta extraction utilities in scraper services

### Definition of Done
- [ ] `supabase db push` completes without errors
- [ ] Both extractors output new fields in extraction response
- [ ] `python ec-scraper/scripts/db_cleanup.py list-postgres` runs successfully
- [ ] Meta tags are logged before AI extraction

### Must Have
- 5 new schema fields: `difficulty_level`, `commitment_level`, `verification_status`, `is_high_cost`, `selectivity`
- Cost parsing handles: "$500", "Free", "TBD", "500 USD", "$80+", edge cases
- db_cleanup.py uses Supabase client pattern, not asyncpg pool

### Must NOT Have (Guardrails)
- NO changes to embedding dimensions or vector search
- NO frontend UI changes
- NO PDF parsing implementation
- NO changes to existing LLM prompts (only add new field instructions)
- NO breaking changes to existing API responses

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (pytest in both codebases)
- **User wants tests**: NO (quick implementation implied)
- **Framework**: pytest
- **QA approach**: Manual verification via CLI commands

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
+-- Task 1: Supabase Migration [no dependencies]
+-- Task 4: Fix db_cleanup.py [no dependencies]
+-- Task 5: Raw Signal Extraction [no dependencies]

Wave 2 (After Wave 1 Task 1):
+-- Task 2: Update Pydantic Models [depends: 1]
+-- Task 3: Cost Flagging Logic [depends: 2]

Wave 3 (Final):
+-- Task 6: Integration Verification [depends: all]

Critical Path: Task 1 -> Task 2 -> Task 3 -> Task 6
Parallel Speedup: ~40% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | 4, 5 |
| 2 | 1 | 3 | None |
| 3 | 2 | 6 | None |
| 4 | None | 6 | 1, 5 |
| 5 | None | 6 | 1, 4 |
| 6 | 1,2,3,4,5 | None | None (final) |

---

## TODOs

- [x] 1. Create Supabase Migration for New Fields

  **What to do**:
  - Create new migration file `20260128000000_add_scraper_fields.sql`
  - Add 5 new columns: `difficulty_level`, `commitment_level`, `verification_status`, `is_high_cost`, `selectivity`
  - Add CHECK constraints for enum-like values
  - Set sensible defaults

  **Must NOT do**:
  - Don't modify existing columns
  - Don't change embedding dimensions
  - Don't add indexes (not needed for these columns)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file creation with straightforward SQL
  - **Skills**: [`git-master`]
    - `git-master`: Track migration file changes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4, 5)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `Networkly-scrape/supabase/migrations/20260127000001_opportunities_schema.sql:1-83` - Existing schema pattern with CHECK constraints
  - `Networkly-scrape/app/models/opportunity.py:128-183` - Field types to match

  **Acceptance Criteria**:
  ```bash
  # Agent runs from Networkly-scrape directory:
  cat supabase/migrations/20260128000000_add_scraper_fields.sql
  # Assert: File exists and contains ALTER TABLE statements for all 5 fields
  # Assert: CHECK constraints present for enum fields
  ```

  **Commit**: YES
  - Message: `feat(scraper): add migration for difficulty, commitment, cost flags`
  - Files: `Networkly-scrape/supabase/migrations/20260128000000_add_scraper_fields.sql`

---

- [x] 2. Update Pydantic Models in Both Codebases
- [x] 3. Implement Cost Flagging Logic ($80 Threshold)
- [x] 6. Integration Verification

  **What to do**:
  - Verify Supabase migration can be applied
  - Verify both extractors produce new fields
  - Verify db_cleanup.py runs without errors
  - Verify meta extraction doesn't break existing flow

  **Must NOT do**:
  - Don't push to production database
  - Don't modify any code in this task

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification only, no code changes
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None
  - **Blocked By**: All previous tasks

  **References**:
  - All files modified in Tasks 1-5

  **Acceptance Criteria**:
  ```bash
  # 1. Verify migration file syntax
  cat Networkly-scrape/supabase/migrations/20260128000000_add_scraper_fields.sql
  # Assert: Valid SQL syntax
  
  # 2. Verify model imports
  cd Networkly-scrape && python -c "from app.models.opportunity import ExtractionResponse; print('Models OK')"
  cd ec-scraper && python -c "from src.db.models import ExtractionResponse; print('Models OK')"
  # Assert: Both print "Models OK"
  
  # 3. Verify db_cleanup
  cd ec-scraper && python scripts/db_cleanup.py --help
  # Assert: No errors
  
  # 4. Verify extractors have cost parsing
  grep -l "_parse_cost" Networkly-scrape/app/services/extractor.py ec-scraper/src/agents/extractor.py
  # Assert: Both files listed
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(scraper): add migration for difficulty, commitment, cost flags` | `supabase/migrations/20260128000000_add_scraper_fields.sql` | File exists |
| 2 | `feat(models): add difficulty, commitment, verification, cost, selectivity fields` | `app/models/opportunity.py`, `src/db/models.py` | Import works |
| 3 | `feat(extractor): add $80 cost threshold flagging` | `app/services/extractor.py`, `src/agents/extractor.py` | Function exists |
| 4 | `fix(cleanup): migrate db_cleanup.py to Supabase client` | `scripts/db_cleanup.py` | --help works |
| 5 | `feat(scraper): add meta tag extraction for raw signals` | `app/services/scraper.py`, `src/crawlers/hybrid_crawler.py` | Function exists |

---

## Success Criteria

### Verification Commands
```bash
# Migration file exists
ls Networkly-scrape/supabase/migrations/20260128000000_add_scraper_fields.sql

# Models have new fields
grep "is_high_cost" Networkly-scrape/app/models/opportunity.py
grep "is_high_cost" ec-scraper/src/db/models.py

# db_cleanup works
python ec-scraper/scripts/db_cleanup.py --help

# Cost parsing function exists
grep "_parse_cost" Networkly-scrape/app/services/extractor.py

# Meta extraction function exists
grep "_extract_meta" Networkly-scrape/app/services/scraper.py
```

### Final Checklist
- [ ] All 5 new fields added to both codebases
- [ ] Cost flagging works with $80 threshold
- [ ] db_cleanup.py no longer crashes on `_pool`
- [ ] Meta extraction extracts og:title, og:description, h1 tags
- [ ] No breaking changes to existing functionality
