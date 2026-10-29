# Preview function cold start: what we learned (parked)

**Status:** parked (2026-10-27). Eric accepted a ~2–3 s cold start for now. Reopen this if cold starts start to bother students. Read this first so the investigation doesn't restart from zero.

The decision is recorded in `docs/adr/0004-page-rendering-and-link-previews.md` (update of 2026-10-27). The work that got us here is `.scratch/pmcq-improvements/` tickets 06, 07 and 09.

## What the cold start affects

`pageSSR` (`/p/**`) and `practiceSetSSR` (`/practice/**`) only produce the HTML shell with link-preview metadata. Everything a student sees is fetched live by the browser afterwards. Found responses are cached at the Firebase Hosting CDN for a day (`s-maxage=86400`). So a student pays a cold start only when both of these are true:

- the CDN has no copy of that URL, which happens at most about once a day per URL per edge, plus after every deploy, which clears the CDN;
- no function instance is warm. Idle instances are shut down after roughly 15 minutes.

The timing loop below deliberately misses the cache, so it measures the worst case, not the typical one.

## Measurements

The command is in ticket 09: cache-busting `?cb=` on a non-existent slug, first-byte time, run in Git Bash.

| | `/practice` cold | `/p` cold | warm |
|---|---|---|---|
| 2026-10-22, before (firebase-admin in our code, 5-min CDN cache) | ~2.3 s | ~2.7 s | ~0.16–0.18 s |
| 2026-10-27, after ticket 06 (plain REST `fetch`, day-long cache) | 1.88 s | 2.66 s | 0.16–0.33 s |
| 2026-10-28, after bundling with esbuild | 1.77 s | 1.88 s | 0.17–0.22 s |

One cold sample per route is noisy. Both functions run the same code, so the `/p` vs `/practice` gap is probably noise, not a real difference.

## Routes investigated

1. **Drop `firebase-admin` from our code.** Done in ticket 06. Our code now reads the database with plain `fetch`. Effect: `/practice` went from ~2.3 to 1.9 s, and `/p` didn't change.
2. **Remove `firebase-admin` from the deployed function entirely.** Not possible while we use `firebase-functions`. In 6.6.0, `firebase-functions/v2/https` requires `firebase-admin/app`, `/auth` and `/app-check` at import time, whether or not they're used, and so does `v1/https`.
   - Measured locally (2026-10-27): importing `firebase-functions/v2/https` takes ~290 ms and loads 317 modules. About 280 ms of that is the `firebase-admin` modules alone.
   - Our handler, `functions/preview-handler.js`, loads in ~3 ms.
3. **Upgrade to `firebase-functions` 7.4.0 (latest on 2026-10-27, with `firebase-admin` 14.5.0).** It still loads `firebase-admin` up front, and it was slower: ~430 ms, 239 modules. Not a win.
4. **More CPU.** No free gain. Cloud Functions 2nd gen already defaults to 1 vCPU for functions with ≤ 2 GB of memory, per the `cpu` option docs in `firebase-functions`.

Conclusion: of the ~1.9–2.7 s cold start, loading our code accounts for a few hundred ms (more on a cloud CPU than locally). The rest is Google starting a container and Node, which no code change can reach.

## Routes still open (cheapest first)

1. **Bundle the function with esbuild.** *Built and deployed 2026-10-28. Cold starts measured 1.77 s (`/practice`, down ~0.1 s) and 1.88 s (`/p`, down ~0.8 s). Both functions run the same bundle, so the true saving is probably in between; one sample per route is noisy. Both are still over 1 s, as expected.* Measured locally: load time ~370 ms → ~105 ms, a 1.8 MB single file. The bundled exports carry identical deploy metadata (`__endpoint`), so `firebase deploy` should treat them the same.
   - Work: add `esbuild` as a dev dependency in `functions/`, a `bundle` script (deliberately not named `build`, so Google's Cloud Build doesn't try to run it), point `main` at the bundle, add a `predeploy` build step to `firebase.json`'s `functions` block, and gitignore the bundle. About half an hour.
   - Expected saving: probably ~0.3–0.8 s off a cold start. This is an estimate scaled from local timings; it hasn't been measured in the cloud. On its own it won't get under 1 s.
2. **Startup CPU boost.** 2nd-gen functions run as Cloud Run services, and Cloud Run can give extra CPU only while an instance starts. Unverified:
   - whether it's already on (Google Cloud console → Cloud Run → service `pagessr` / `practicesetssr` → Edit → "Startup CPU boost");
   - whether `firebase deploy` resets it.

   This costs a few minutes to check.
3. **Merge the two exports into one function.** This doesn't make a cold start shorter, but `/p` and `/practice` traffic would keep one shared instance warm, so cold starts happen less often. It's required anyway before option 4 makes sense, so one warm instance covers both routes. Small change: one export that routes by path, and both `firebase.json` rewrites point at it.
4. **Keep one instance warm (`minInstances: 1`).** This removes cold starts entirely. It's about $3/month at `cpu: "gcf_gen1"`, or about $8/month at the default 1 vCPU (Firebase pricing as of 2026-10-22). Do option 3 first, so it's one instance rather than two.
5. **Move the handler to a Cloudflare Worker.** No cold starts (Workers start in milliseconds), and the free tier covers this traffic easily. `mrhsieh.app` DNS is already on Cloudflare, currently DNS-only (gray cloud).
   - **Ready:** `functions/preview-handler.js` is pure. A request path and an injected `fetchJson` go in; `{ status, headers, body }` comes out, and it has its own tests. It was written to move unchanged; it only needs a small Worker adapter. It's CommonJS, so it needs either an ESM wrapper or Wrangler's bundling.
   - **Must be solved first:**
     - Worker routes (`mrhsieh.app/p/*`, `mrhsieh.app/practice/*`) need the `mrhsieh.app` record proxied (orange cloud). Firebase Hosting provisions and renews its own certificate for the domain, and a Cloudflare proxy in front can break that renewal. Check Firebase's current guidance and set Cloudflare SSL to "Full (strict)".
     - Decide which layer caches the shell, the Cloudflare edge (Cache API or `Cache-Control`) or neither, to avoid confusing double caching.
     - The rest of the site must still pass straight through to Firebase Hosting.
     - It's a second deploy platform, so `wrangler deploy` joins `firebase deploy`.
   - ADR 0004 says this move gets its own ADR.

## Re-measuring

Use the loop from ticket 09 after at least 30 idle minutes. Run 1 of each route is the cold start.

```bash
for p in practice p; do for i in 1 2 3; do
  curl -s -o /dev/null -w "$p run $i: %{http_code} first-byte %{time_starttransfer}s\n" \
    "https://mrhsieh.app/$p/zz-timing-test?cb=$RANDOM$RANDOM"
done; done
```

Take two or three cold samples on different days before trusting a number.
