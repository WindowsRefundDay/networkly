# Model Configuration & Usage Guide

## 🔑 API Key
**Google API Key**: `AIzaSyAFAx-_UV3lIV9YFWq8wyRBXhoXS_9Gpbw`

## 🤖 Models Configured

### Main Model: `gemini-3-flash-preview`
- **Configuration**: `gemini_pro_model` in `settings.py`
- **Used For**:
  - Discovery query generation
  - URL evaluation and scoring
  - Goal planning and roadmap generation
  - Complex reasoning tasks

### Fast Model: `gemini-2.5-flash-lite`
- **Configuration**: `gemini_flash_model` in `settings.py`
- **Used For**:
  - Opportunity extraction from web pages (when `use_fast_model=True`)
  - Opportunity matching to user profiles (when `use_fast_model=True`)
  - High-volume, structured data extraction tasks

## 📊 Detailed Model Usage Breakdown

### 1. **Discovery Agent** (`src/agents/discovery.py`)
- **Model**: `gemini-3-flash-preview` (main model)
- **Usage**: 
  - Generates search queries for finding opportunities
  - Evaluates URLs for relevance
  - Plans discovery strategy
- **Why Main Model**: Requires complex reasoning to generate diverse, effective search queries

### 2. **Extractor Agent** (`src/agents/extractor.py`)
- **Model**: `gemini-2.5-flash-lite` (fast model)
- **Usage**: 
  - Extracts structured opportunity data from webpage content
  - Uses `use_fast_model=True` flag
- **Why Fast Model**: High-volume task, structured output, doesn't need complex reasoning

### 3. **Goal Planner** (`src/agents/goal_planner.py`)
- **Model**: `gemini-3-flash-preview` (main model)
- **Usage**: 
  - Plans career goals and roadmaps
  - Generates personalized recommendations
- **Why Main Model**: Requires strategic thinking and complex planning

### 4. **Matcher Agent** (`src/agents/matcher.py`)
- **Model**: `gemini-2.5-flash-lite` (fast model)
- **Usage**: 
  - Matches opportunities to user profiles
  - Uses `use_fast_model=True` flag
- **Why Fast Model**: Pattern matching task, can be done efficiently with fast model

## 🔧 Configuration Files

### Settings (`src/config/settings.py`)
```python
gemini_pro_model: str = "gemini-3-flash-preview"
gemini_flash_model: str = "gemini-2.5-flash-lite"
GOOGLE_API_KEY: Optional[str] = None  # Set in .env
```

### Environment File (`.env`)
```bash
GOOGLE_API_KEY=AIzaSyAFAx-_UV3lIV9YFWq8wyRBXhoXS_9Gpbw
GEMINI_PRO_MODEL=gemini-3-flash-preview
GEMINI_FLASH_MODEL=gemini-2.5-flash-lite
API_MODE=gemini
```

## 🎯 Model Selection Logic

The system automatically selects the model based on the `GenerationConfig`:

```python
# Main model (gemini-3-flash-preview)
config = GenerationConfig(use_fast_model=False)  # or omitted

# Fast model (gemini-2.5-flash-lite)
config = GenerationConfig(use_fast_model=True)
```

## 📈 Performance Characteristics

### `gemini-3-flash-preview`
- **Speed**: Fast (Flash model)
- **Capability**: High (latest preview model)
- **Best For**: Complex reasoning, planning, strategy
- **Cost**: Moderate

### `gemini-2.5-flash-lite`
- **Speed**: Very Fast (Lite model)
- **Capability**: Good (structured extraction)
- **Best For**: High-volume extraction, pattern matching
- **Cost**: Low

## ✅ Verification

To verify your configuration is correct:

```bash
cd ec-scraper
python -c "from src.config import get_settings; s = get_settings(); print(f'Main: {s.gemini_pro_model}'); print(f'Fast: {s.gemini_flash_model}'); print(f'API Key: {s.GOOGLE_API_KEY[:20]}...')"
```

Expected output:
```
Main: gemini-3-flash-preview
Fast: gemini-2.5-flash-lite
API Key: AIzaSyAFAx-_UV3lIV9Y...
```
