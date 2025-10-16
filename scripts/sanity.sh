#!/usr/bin/env bash
set -e

# Configurable endpoints and assets
BASE=${BASE:-http://localhost:3000/api}
IMAGE=${IMAGE:-utils/image.png}
AUDIO=${AUDIO:-utils/beep.wav}
IMG_NAME=$(basename "$IMAGE")
AUDIO_NAME=$(basename "$AUDIO")

echo "== Sanity Test =="
echo "BASE=$BASE IMAGE=$IMAGE AUDIO=$AUDIO"

echo "\n== Health =="
curl -s "$BASE/health" || true

echo "\n== Legacy endpoints (expect 404) =="
curl -s -o /dev/null -w "GET /api/v1/process -> %{http_code}\n" "$BASE/v1/process"
curl -s -o /dev/null -w "POST /api/v1/job/ffmpeg -> %{http_code}\n" -X POST "$BASE/v1/job/ffmpeg"

echo "\n== Create session =="
RESP=$(curl -s -X POST "$BASE/v1/sessions/create")
echo "$RESP"
SESSION=$(echo "$RESP" | sed -E 's/.*"sessionId":"?([^"}]+)"?.*/\1/')
echo "Session: $SESSION"

echo "\n== Upload assets =="
curl -s -F "file=@$IMAGE" "$BASE/v1/sessions/$SESSION/upload"; echo
curl -s -F "file=@$AUDIO" "$BASE/v1/sessions/$SESSION/upload"; echo

poll_job() {
  local JOB_ID="$1"; local MAX="$2"; local STATUS
  for i in $(seq 1 "$MAX"); do
    RESP=$(curl -s "$BASE/v1/jobs/$JOB_ID")
    STATUS=$(echo "$RESP" | sed -E 's/.*"status":"?([^"}]+)"?.*/\1/')
    echo "Job $JOB_ID status: $STATUS"
    if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
      echo "Final $JOB_ID: $RESP"
      return 0
    fi
    sleep 1
  done
  echo "Job $JOB_ID did not complete within timeout"
  return 1
}

echo "\n== image-to-video =="
RESP=$(curl -s -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION\",\"images\":[\"$IMG_NAME\"],\"duration\":4,\"orientation\":\"landscape\"}" \
  "$BASE/v1/sessions/image-to-video")
echo "$RESP"
JOB1=$(echo "$RESP" | sed -E 's/.*"jobId":"?([^"}]+)"?.*/\1/')
OUT1=$(echo "$RESP" | sed -E 's/.*"outputFilename":"?([^"}]+)"?.*/\1/')
echo "JOB1=$JOB1 OUT1=$OUT1"
poll_job "$JOB1" 30

echo "\n== add-audio =="
RESP=$(curl -s -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION\",\"videoFile\":\"$OUT1\",\"audioFile\":\"$AUDIO_NAME\",\"volume\":1}" \
  "$BASE/v1/sessions/add-audio")
echo "$RESP"
JOB2=$(echo "$RESP" | sed -E 's/.*"jobId":"?([^"}]+)"?.*/\1/')
OUT2=$(echo "$RESP" | sed -E 's/.*"outputFilename":"?([^"}]+)"?.*/\1/')
echo "JOB2=$JOB2 OUT2=$OUT2"
poll_job "$JOB2" 30

echo "\n== add-text-overlay =="
RESP=$(curl -s -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION\",\"videoFile\":\"$OUT2\",\"text\":\"Hello World\",\"subtitle\":\"Sanity Test\",\"position\":\"top\",\"overlayRatio\":0.29}" \
  "$BASE/v1/sessions/add-text-overlay")
echo "$RESP"
JOB3=$(echo "$RESP" | sed -E 's/.*"jobId":"?([^"}]+)"?.*/\1/')
OUT3=$(echo "$RESP" | sed -E 's/.*"outputFilename":"?([^"}]+)"?.*/\1/')
echo "JOB3=$JOB3 OUT3=$OUT3"
poll_job "$JOB3" 60

echo "\n== Download overlay result =="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/v1/sessions/$SESSION/download/$OUT3")
echo "Download HTTP $CODE"

echo "\n== Done =="
if [ "$CODE" = "200" ]; then
  echo "Sanity: PASS"
else
  echo "Sanity: FAIL"
  exit 1
fi