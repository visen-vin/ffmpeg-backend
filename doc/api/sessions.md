# Sessions API (v1)

Base: `/api/v1/sessions`

## Create Session
- `POST /create`
- 201 → `{ "sessionId": "<uuid>" }`

Example (curl)
```
curl -sS -X POST http://localhost:3000/api/v1/sessions/create
```

Response
```
{
  "sessionId": "1c7b7e70-bc74-4f54-8545-c84b2300082c"
}
```

## Upload to Session
- `POST /:sessionId/upload`
- Multipart form-data, field name: `file`
- 200 → `{ fileName: "<originalname>", message: "File uploaded successfully to session." }`
- Stores uploads in `storage/sessions/:sessionId/input/`
 - Session identification: uses path parameter `:sessionId` (body `sessionId` is ignored)

Example (curl)
```
curl -sS -F file=@utils/sample.txt \
  http://localhost:3000/api/v1/sessions/<sessionId>/upload
```

Response
```
{
  "fileName": "sample.txt",
  "message": "File uploaded successfully to session."
}
```

## Download from Session Output
- `GET /:sessionId/download/:filename`
- 200 → file content
- 404 → `{ error: "File not found" }`
 - Session identification: uses path parameter `:sessionId` (body `sessionId` is ignored)

Example (curl)
```
curl -sS -O http://localhost:3000/api/v1/sessions/<sessionId>/download/<filename>
```

## Delete Session
- `DELETE /:sessionId`
- 200 → `{ message: "Session and all its files have been deleted." }`
 - Session identification: uses path parameter `:sessionId` (body `sessionId` is ignored)

Example (curl)
```
curl -sS -X DELETE http://localhost:3000/api/v1/sessions/<sessionId>
```

Response
```
{
  "message": "Session and all its files have been deleted."
}
```

---

# Operation Endpoints
Operations enqueue jobs in the session queue and return a `jobId` and `outputFilename`.

All bodies are JSON. The `sessionId` MUST be provided in the request body for all operation endpoints; path parameters are not used to identify the session for operations.

## Image → Video
- `POST /image-to-video`
- Body:
```
{
  "sessionId": "<sessionId>",
  "images": ["image1.jpg", "image2.jpg"],
  "duration": 6,
  "orientation": "vertical" | "landscape" (optional; default "vertical")
}
```
- Notes:
  - `images[]` must exist in `input/`.
  - `duration` optional (seconds).
  - `orientation` controls output dimensions (near 4K by default):
    - `vertical` (9:16) → `2160x3840` (default)
    - `landscape` (16:9) → `3840x2160`
  - You may also specify `resolution` (e.g., `"3840x2160"`); if provided, it overrides `orientation`.
- 202 → `{ jobId, status: "queued", outputFilename }`

Example (curl)
```
curl -sS -X POST http://localhost:3000/api/v1/sessions/image-to-video \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<sessionId>",
    "images": ["image1.jpg", "image2.jpg"],
    "duration": 6,
    "orientation": "landscape"
  }'
```

Response
```
{
  "jobId": "job-7d316500",
  "status": "queued",
  "outputFilename": "7179bb56.mp4"
}
```

## Add Audio
- `POST /add-audio`
- Body:
```
{
  "sessionId": "<sessionId>",
  "videoFile": "<from output/>.mp4",
  "audioFile": "music.mp3",
  "volume": 0.5
}
```
- Notes: `videoFile` must exist in `output/`, `audioFile` in `input/`. `volume` optional.
- 202 → `{ jobId, status: "queued", outputFilename }`

Example (curl)
```
curl -sS -X POST http://localhost:3000/api/v1/sessions/add-audio \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<sessionId>",
    "videoFile": "7179bb56.mp4",
    "audioFile": "music.mp3",
    "volume": 0.5
  }'
```

Response
```
{
  "jobId": "job-a8a5a958",
  "status": "queued",
  "outputFilename": "13e5e8f7.mp4"
}
```

## Apply Effects
- `POST /apply-effects`
- Body:
```
{
  "sessionId": "<sessionId>",
  "videoFile": "<from output/>.mp4",
  "effects": [ { "type": "kenburns", "direction": "zoom-in" } ],
  "orientation": "vertical" | "landscape" (optional; default "vertical"),
  "resolution": "<width>x<height>" (optional)
}
```
- Notes:
  - Effects are applied via FFmpeg filters (e.g., `zoompan`).
  - `orientation` and `resolution` are used to preserve output dimensions, especially for Ken Burns.
  - Defaults match `image-to-video`: `vertical` (2160x3840) or `landscape` (3840x2160).
- 202 → `{ jobId, status: "queued", outputFilename }`

Example (curl)
```
curl -sS -X POST http://localhost:3000/api/v1/sessions/apply-effects \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<sessionId>",
    "videoFile": "13e5e8f7.mp4",
    "effects": [ { "type": "kenburns", "direction": "zoom-in" } ]
  }'
```

Response
```
{
  "jobId": "job-86760f16",
  "status": "queued",
  "outputFilename": "4f7c9536.mp4"
}
```

## Add Overlay
- `POST /add-overlay`
- Body:
```
{
  "sessionId": "<sessionId>",
  "videoFile": "<from output/>.mp4",
  "text": "Overlay title",
  "subtitle": "Optional subtitle"
}
```
- Notes: Adds text overlay (basic placeholder in current implementation).
- 202 → `{ jobId, status: "queued", outputFilename }`

Example (curl)
```
curl -sS -X POST http://localhost:3000/api/v1/sessions/add-overlay \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<sessionId>",
    "videoFile": "13e5e8f7.mp4",
    "text": "Overlay title",
    "subtitle": "Optional subtitle"
  }'
```

Response
```
{
  "jobId": "job-<uuid>",
  "status": "queued",
  "outputFilename": "<random>.mp4"
}
```

---

# Job Status
- `GET /api/v1/jobs/:jobId`
- Returns the job JSON from the session where it was queued.
- Searches per-session `queue/`, `completed/`, `failed/`.

Example (curl)
```
curl -sS http://localhost:3000/api/v1/jobs/job-86760f16
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

## Result JSON includes
- `status`: `queued` | `completed` | `failed`
- `args`: FFmpeg args used
- `code`: FFmpeg exit code
- `logs`: FFmpeg stdout/stderr lines
- `startedAt`, `finishedAt`
- `outputFilename`, `operation`, `params`

## Storage Layout (per session)
```
storage/sessions/:sessionId/
  input/
  output/
  queue/
  completed/
  failed/
  meta.json
```