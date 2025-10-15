# Process API (v1)

Base: `/api/v1/process`

Create Process
- `POST /create`
- 201 → `{ "processId": "<uuid>" }`

Upload Files
- `POST /:processId/upload`
- Multipart form-data; any field name accepted.
- 200 → `{ uploaded: <count>, files: [ { originalname, filename, size } ] }`
- Files stored in `storage/processes/:processId/input/`
- Requires existing process; 404 if not found.

Download Output
- `GET /:processId/download/:filename`
- 200 → file stream
- 404 → `{ error: "File not found" }`

Delete Process
- `DELETE /:processId`
- 204 → empty body
- 404/500 on errors

Examples

Create
```
curl -sS -X POST http://localhost:3000/api/v1/process/create
```

Upload
```
curl -sS -F file=@utils/sample.txt \
  http://localhost:3000/api/v1/process/<processId>/upload
```

Download
```
curl -sS -O \
  http://localhost:3000/api/v1/process/<processId>/download/out.mp4
```

Delete
```
curl -sS -X DELETE \
  http://localhost:3000/api/v1/process/<processId>
```