# Process API (v1)

Base: `/api/v1/process`

Create Process
- `POST /create`
- 201 → `{ "processId": "<uuid>" }`

Request
```
POST /api/v1/process/create
```

Example (curl)
```
curl -sS -X POST http://localhost:3000/api/v1/process/create
```

Response
```
{
  "processId": "b3a9d1e2-..."
}
```

Upload Files
- `POST /:processId/upload`
- Multipart form-data; any field name accepted.
- 200 → `{ uploaded: <count>, files: [ { originalname, filename, size } ] }`
- Files stored in `storage/processes/:processId/input/`
- Requires existing process; 404 if not found.

Request
```
POST /api/v1/process/<processId>/upload
Content-Type: multipart/form-data
```

Example (curl)
```
curl -sS -F file=@utils/sample.txt \
  http://localhost:3000/api/v1/process/<processId>/upload
```

Response
```
{
  "uploaded": 1,
  "files": [
    { "originalname": "sample.txt", "filename": "<stored>.txt", "size": 12 }
  ]
}
```

Download Output
- `GET /:processId/download/:filename`
- 200 → file stream
- 404 → `{ error: "File not found" }`

Request
```
GET /api/v1/process/<processId>/download/<filename>
```

Example (curl)
```
curl -sS -O \
  http://localhost:3000/api/v1/process/<processId>/download/out.mp4
```

Delete Process
- `DELETE /:processId`
- 204 → empty body
- 404/500 on errors

Request
```
DELETE /api/v1/process/<processId>
```

Example (curl)
```
curl -sS -X DELETE \
  http://localhost:3000/api/v1/process/<processId>
```

Response
```
<empty>
```

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