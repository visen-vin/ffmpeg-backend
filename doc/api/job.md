# Job API (v1)

Base: `/api/v1/job`

Queue FFmpeg Job
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

Worker Behavior
- Moves `queue/<jobId>.json` to `.processing` while running.
- Writes result JSON to `completed/<jobId>.json` or `failed/<jobId>.json`.
- Result JSON includes: `status`, `code`, `logs`, `startedAt`, `finishedAt`.

Example
```
curl -sS -X POST http://localhost:3000/api/v1/job/ffmpeg \
  -H "Content-Type: application/json" \
  -d '{
    "processId":"<processId>",
    "args":["-y","-f","lavfi","-i","testsrc=size=128x128:rate=1","-t","1","-pix_fmt","yuv420p","output/out.mp4"]
  }'
```

Checking Results
- Completed: `storage/completed/<jobId>.json`
- Failed: `storage/failed/<jobId>.json`
- Outputs: `storage/processes/<processId>/output/`