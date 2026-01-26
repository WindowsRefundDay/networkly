# EC Scraper Discovery API Dockerfile
# Optimized for Railway deployment

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory
WORKDIR /app

# Install system dependencies for crawl4ai, scrapy, chromadb
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libssl-dev \
    libxml2-dev \
    libxslt1-dev \
    zlib1g-dev \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install playwright dependencies for crawl4ai (browser-based crawling)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files and source code for installation
COPY pyproject.toml README.md ./
COPY src/ ./src/

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install . && \
    pip install uvicorn[standard]

# Install playwright browsers for crawl4ai
RUN playwright install chromium && \
    playwright install-deps chromium

# Copy additional application files
COPY scripts/ ./scripts/
COPY data/ ./data/

# Create data directories
RUN mkdir -p /app/data

# Default port (Railway sets PORT env var)
ENV PORT=8000

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Run the FastAPI server
CMD uvicorn src.api.server:app --host 0.0.0.0 --port ${PORT}
