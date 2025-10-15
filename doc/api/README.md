# API Overview

Base: `/api`

Health
- `GET /api/health` → `{ status: "ok" }`

Example (curl)
```
curl -sS http://localhost:3000/api/health
```

Response
```
{ "status": "ok" }
```

## Sessions API (v1)
- `POST /api/v1/sessions/create` → Create a session → `{ sessionId }`
- `POST /api/v1/sessions/:sessionId/upload` → Upload a file (multipart `file`)
- `GET /api/v1/sessions/:sessionId/download/:filename` → Download output
- `DELETE /api/v1/sessions/:sessionId` → Delete session and files
 - Note: Upload/Download/Delete identify session via path `:sessionId` (body `sessionId` ignored).

### Session Operations
- `POST /api/v1/sessions/image-to-video` → Queue slideshow (sessionId in body)
  - Supports `orientation` (`vertical` default → 2160x3840; `landscape` → 3840x2160)
  - Optional `resolution` (e.g., `"3840x2160"`) overrides orientation mapping
- `POST /api/v1/sessions/add-audio` → Mix audio into video (sessionId in body)
- `POST /api/v1/sessions/apply-effects` → Apply effects (sessionId in body)
- `POST /api/v1/sessions/add-overlay` → Add text overlay (sessionId in body)

## Jobs API (v1)
- `GET /api/v1/jobs/:jobId` → Job status from its session (`queued|completed|failed`)

## Legacy Process API (v1)
- `POST /api/v1/process/create`
- `POST /api/v1/process/:processId/upload`
- `GET /api/v1/process/:processId/download/:filename`
- `DELETE /api/v1/process/:processId`

## Legacy Job API (v1)
- `POST /api/v1/job/ffmpeg` → Queue raw ffmpeg args

Worker
- Polls per-session `storage/sessions/<id>/queue/` and writes results to `storage/sessions/<id>/{completed,failed}/`.