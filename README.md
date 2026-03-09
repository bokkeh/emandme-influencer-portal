This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
2
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Google Cloud Storage Upload Setup (Service Account)

Use this when you are ready to move media uploads into a GCS bucket.

1. Create a bucket in GCP and enable Uniform bucket-level access.
2. Create a service account with `Storage Object Admin` on that bucket only.
3. Do not commit service account JSON keys to git.
4. Store credentials in env vars instead:
   - `GCS_PROJECT_ID` 
   - `GCS_BUCKET`
   - `GCS_CLIENT_EMAIL`
   - `GCS_PRIVATE_KEY` (multi-line key with `\n` escaped in env)
5. In Vercel, set those env vars for Preview + Production and redeploy.
6. Update upload APIs to use signed upload URLs (direct browser-to-GCS upload) to avoid serverless request body size limits.
7. Keep uploaded file metadata in Postgres exactly as today (`blobUrl` can store GCS URLs).

Security note: `*-login-*.json` and `*service-account*.json` are ignored in `.gitignore`, but rotate any key if it was ever shared.
