# Job API (v1)

This section covers the legacy raw FFmpeg job queue and the new job status endpoint.

## Queue Raw FFmpeg Job (legacy)

Base: `/api/v1/job`

- `POST /ffmpeg`
- Body (JSON):
```
{
  "processId": "<uuid>",
  "args": ["-y", "-f", "lavfi", "-i", "testsrc=size=128x128:rate=1", "-t", "1", "-pix_fmt", "yuv420p", "output/out.mp4"]
}
```
- `args` required; `processId` optional.
- If `processId` provided, job runs with `cwd = storage/processes/<id>/`.
- Prefer relative output paths like `output/<name>.mp4`.
- 202 → `{ "jobId": "<uuid>", "status": "queued" }`

Worker Behavior (legacy)
- Moves `storage/queue/<jobId>.json` to `.processing` while running.
- Writes result JSON to `storage/{completed,failed}/<jobId>.json`.

Example
```
curl -sS -X POST http://localhost:3000/api/v1/job/ffmpeg \
  -H "Content-Type: application/json" \
  -d '{
    "processId":"<processId>",
    "args":["-y","-f","lavfi","-i","testsrc=size=128x128:rate=1","-t","1","-pix_fmt","yuv420p","output/out.mp4"]
  }'
```

Response
```
{
  "jobId": "a1b2c3d4-...",
  "status": "queued"
}
```

## Job Status (sessions)

Base: `/api/v1/jobs`

- `GET /:jobId` → Returns the job record from the session where it was queued.
- Searches per-session:
  - `storage/sessions/:sessionId/queue/:jobId.json`
  - `storage/sessions/:sessionId/completed/:jobId.json`
  - `storage/sessions/:sessionId/failed/:jobId.json`

Result JSON includes: `status`, `code`, `logs`, `startedAt`, `finishedAt`, `args`, `operation`, `params`, `outputFilename`.

Outputs for session jobs are in: `storage/sessions/:sessionId/output/`

Example (curl)
```
curl -sS http://localhost:3000/api/v1/jobs/<jobId>
```

Response (completed)
```
{
  "jobId": "job-86760f16",
  "sessionId": "<sessionId>",
  "operation": "apply-effects",
  "params": { "videoFile": "13e5e8f7.mp4", "effects": [ { "type": "kenburns", "direction": "zoom-in" } ] },
  "outputFilename": "4f7c9536.mp4",
  "status": "completed",
  "args": ["-i","output/13e5e8f7.mp4","-vf","zoompan=z='zoom+0.001':d=125:s=1280x720","output/4f7c9536.mp4"],
  "code": 0,
  "logs": ["..."],
  "startedAt": "2024-10-16T02:17:00.000Z",
  "finishedAt": "2024-10-16T02:18:00.000Z"
}
```