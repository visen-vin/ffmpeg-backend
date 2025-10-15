# API Overview

Base: `/api`

Health
- `GET /api/health` → `{ status: "ok" }`

Process API (v1)
- `POST /api/v1/process/create` → Create a process
- `POST /api/v1/process/:processId/upload` → Upload files (multipart)
- `GET /api/v1/process/:processId/download/:filename` → Download output
- `DELETE /api/v1/process/:processId` → Delete process dir

Job API (v1)
- `POST /api/v1/job/ffmpeg` → Queue an ffmpeg job

Worker
- Polls `storage/queue/` and writes results to `storage/completed/` or `storage/failed/`.