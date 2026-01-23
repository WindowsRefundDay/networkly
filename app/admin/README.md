# Admin Panel

Simple admin interface at `/admin` for system monitoring and management.

## Features

- **System Stats**: DB health, API status, error tracking
- **GitHub Integration**: Current branch/commit, pull latest changes
- **Test Runner**: Run test suite from UI
- **Config Management**: Update runtime configuration

## Access

Navigate to `/admin` (requires authentication)

## API Endpoints

- `GET /api/admin/stats` - System statistics
- `GET /api/admin/github` - GitHub status
- `POST /api/admin/github/pull` - Pull latest from origin
- `GET /api/admin/test` - Run test suite
- `GET /api/admin/config` - Get configuration
- `POST /api/admin/config` - Update configuration

## Configuration

Stored in `data/admin-config.json`

Default keys:
- `MAX_AI_REQUESTS_PER_MIN`
- `ENABLE_DISCOVERY_CACHE`
- `DB_CONNECTION_POOL_SIZE`
- `API_TIMEOUT_MS`
