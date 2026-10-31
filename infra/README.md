# Sync server

A Cloudflare Worker with one KV namespace: about forty lines of code that store
and return opaque blobs. There is no account, no email, no listing, no search —
and nothing readable, because the app encrypts before it uploads.

Free tier is more than enough: 100 000 requests and reads per day.

## What the server knows

| | |
| --- | --- |
| The storage id | `SHA-256("qada-sync:v1:" + code)` — cannot be reversed |
| The payload | AES-GCM ciphertext; the key never leaves the phones |
| Metadata | IP address, request time, size — like any HTTP server |

Two devices that use the same sync code write to the same id. Two different
codes never collide.

## Deploy

```bash
npm install -g wrangler
wrangler login

# 1. create the KV namespace and copy the id it prints
wrangler kv namespace create QADA

# 2. paste the id into wrangler.toml
#    [[kv_namespaces]] binding = "QADA"  id = "..."

# 3. deploy
wrangler deploy
```

The deploy prints a URL like `https://qada-sync.your-name.workers.dev`.

## Point the app at it

In `app/js/config.js`:

```js
export const LINKS = {
  // …
  syncEndpoint: 'https://qada-sync.your-name.workers.dev',
};
```

Until that is set, the Sync card in Settings is hidden — the app works exactly
as before.

You can also leave it empty and let each user paste the address in
Settings → Sync → *Server address*. That is what the field is for.

## Limits worth knowing

- **256 KB per blob.** A lifetime ledger compresses to a few KB; the limit only
  guards against abuse.
- **No rate limiting.** Cloudflare's free tier already absorbs small floods. If
  the endpoint ever gets attention, add a `[[ratelimits]]` rule or a Durable
  Object counter.
- **No versioning.** The app pulls, merges and pushes; the last writer wins, and
  because the merge is a union that is always safe. A lost response never loses
  a prayer — the next sync re-merges.

## Test it by hand

```bash
ID=$(node -e "crypto.subtle.digest('SHA-256', new TextEncoder().encode('qada-sync:v1:AAAA-AAAA-AAAA-AAAA-AAAA')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,40)))")

curl -s -X PUT "https://YOUR.workers.dev/$ID" -H 'content-type: application/json' -d '{"v":1,"ct":"x"}'
curl -s "https://YOUR.workers.dev/$ID"
curl -s -X DELETE "https://YOUR.workers.dev/$ID"
```
