# API Curl Cheatsheet

A quick reference of working `curl` commands for the local API.

Replace placeholders before running:
- BASE: `http://localhost:3000`
- SID: Your Session ID (e.g., `e124304f-e4fd-4e1d-9caf-31f9696e8d54`)
- FILES: Paths/filenames you uploaded to the session

You can set helpers:
```bash
BASE=http://localhost:3000
SID=<your-session-id>
```

---

## Sessions

### Create Session
```bash
curl -X POST $BASE/api/v1/sessions/create
```

### Upload File to Session (image/audio etc.)
```bash
curl -F "file=@/absolute/path/to/your/file.ext" \
  $BASE/api/v1/sessions/$SID/upload
```

### Download File from Session
```bash
curl -o local_output.ext \
  $BASE/api/v1/sessions/$SID/download/<filename-in-session>
```

### Delete Session
```bash
curl -X DELETE $BASE/api/v1/sessions/$SID
```

---

## Operations (send `sessionId` in JSON body)

### Image → Video (vertical)
```bash
curl -X POST $BASE/api/v1/sessions/image-to-video \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SID'",
    "images": ["image.png"],
    "duration": 3
  }'
```
Response includes: `jobId`, `outputFilename`.

### Add Audio to Video
- Ensure the audio file is uploaded to the session first.
```bash
curl -X POST $BASE/api/v1/sessions/add-audio \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SID'",
    "videoFile": "<video in output dir>.mp4",
    "audioFile": "<audio in input dir>.wav",
    "volume": 1
  }'
```

### Apply Effects to Video
- `effects` is an array of effect names supported by the backend.
```bash
curl -X POST $BASE/api/v1/sessions/apply-effects \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SID'",
    "videoFile": "<video in output dir>.mp4",
    "effects": ["grayscale", "fadein"]
  }'
```

### Add Text Overlay
- `position`: one of `top`, `center`, `bottom`
- `overlayRatio`: `"auto"` or a number between `0` and `1` (e.g., `0.25`)
```bash
curl -X POST $BASE/api/v1/sessions/add-text-overlay \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SID'",
    "videoFile": "<video in output dir>.mp4",
    "text": "Hello World",
    "subtitle": "Optional subtitle",
    "position": "top",
    "overlayRatio": 0.25
  }'
```

---

## Jobs

### Get Job Status
```bash
curl $BASE/api/v1/jobs/<jobId>
```
Response includes: `status` (`queued`/`processing`/`completed`), `outputFilename` when available.

---

## Example Workflow

1) Create session
```bash
SID=$(curl -s -X POST $BASE/api/v1/sessions/create | sed -E 's/.*"sessionId":"([^"]+)".*/\1/')
echo $SID
```

2) Upload an image
```bash
curl -F "file=@utils/image.png" $BASE/api/v1/sessions/$SID/upload
```

3) Convert image to video
```bash
RESP=$(curl -s -X POST $BASE/api/v1/sessions/image-to-video -H "Content-Type: application/json" -d '{"sessionId":"'$SID'","images":["image.png"],"duration":3}')
JOB=$(echo "$RESP" | sed -E 's/.*"jobId":"([^"]+)".*/\1/')
echo $JOB
```

4) Check job status
```bash
curl $BASE/api/v1/jobs/$JOB
```

5) Apply text overlay (after the previous job completes; replace with the produced `outputFilename`)
```bash
curl -X POST $BASE/api/v1/sessions/add-text-overlay \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SID'",
    "videoFile": "<outputFilename from previous job>.mp4",
    "text": "Hello World",
    "subtitle": "Server Test",
    "position": "top",
    "overlayRatio": 0.25
  }'
```

6) Download the final file
```bash
curl -o final.mp4 $BASE/api/v1/sessions/$SID/download/<final-output>.mp4
```

---

Notes:
- All endpoints assume the server is running at `http://localhost:3000`.
- For file paths in `-F "file=@..."`, use absolute paths for reliability.
- Upload assets (images/audio) before calling operations that reference them.