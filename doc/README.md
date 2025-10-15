# FFmpeg Backend Documentation

This folder contains API documentation for the FFmpeg backend.

- API Overview: `doc/api/README.md`
- Process API: `doc/api/process.md`
- Job API: `doc/api/job.md`
- Sessions API: `doc/api/sessions.md`

Conventions
- Base API path: `/api`
- Versioned routes under: `/api/v1`
- JSON responses unless downloading files

Getting Started
- Start API: `npm start`
- Start worker: `npm run worker` (or `npm run dev:worker`)

Typical Flow (sessions)
- Create a session, upload inputs to `input/`
- Queue operations (image-to-video, apply-effects, add-audio)
- Check job status via `GET /api/v1/jobs/:jobId`
- Download results from `output/`