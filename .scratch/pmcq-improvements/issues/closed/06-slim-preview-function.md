# 06: Slim, longer-cached preview function

**What to build:** The link-preview function behind `/p/<slug>` and `/practice/<slug>` starts faster and runs less often. It reads the slug index and title through the database's public REST API with plain `fetch` instead of loading `firebase-admin`. Found pages are cached for a day at the CDN, while "not found" responses are never cached, so a link shared before its target exists starts working once it does. The Practice Set shell also carries the resolved Practice Set id for the browser to use (ticket 07). Link previews in Google Classroom keep showing real titles.

See the spec (`../spec.md`): "Link-preview function", plus the ADR 0004 update.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Request handling for both routes is a pure function: request path plus an injected JSON-fetch function in, status + headers + HTML body out. A thin adapter wires it to Cloud Functions. Both exports stay, and their routes in the hosting config are unchanged.
- [x] `firebase-admin` is no longer used, and is removed from the functions dependencies if nothing else needs it.
- [x] Found: 200 with a day-long CDN cache header. Not found or no slug: 404 with no-store/no-cache.
- [x] The Practice Set shell embeds the Practice Set id in a form the browser can read without parsing the title (a data attribute or small inline JSON; document which in the code). All interpolated values stay HTML-escaped.
- [x] Tests use Node's built-in test runner inside `functions/`, with an injected fake fetch, and cover:
  - found and not found for both routes
  - cache headers for each
  - the embedded id
  - a title containing `<`, `"` and `&` escaped
- [x] The test command is added to CLAUDE.md's "before considering done" checklist for changes under `functions/`.
- [x] Not deployed by this ticket; deploy and timing are ticket 09.

## Comments

- Pure handlers: `functions/preview-handler.js` exports `handlePageRequest(path, fetchJson)` and `handlePracticeSetRequest(path, fetchJson)`, returning `{ status, headers, body }`. `fetchJson(url)` gets a full REST URL (`https://formative-platform-default-rtdb.firebaseio.com/<path>.json`) and resolves to parsed JSON, `null` if absent. `index.js` is the adapter; its `fetch` wrapper throws on non-2xx, so a database outage is an uncached 500, not a false 404.
- Embedded id (for ticket 07): `<body data-practice-set-id="...">`, read in the browser as `document.body.dataset.practiceSetId`. Escaped; absent on the 404 shell.
- Cache headers: found `public, max-age=300, s-maxage=86400` (CDN a day, browser 5 min); not found `no-store`.
- `firebase-admin` is no longer required by our code, but stays in `functions/package.json`: `firebase-functions` declares it as a peer dependency and `firebase-functions/v2/https` loads it at require time. The cold-start saving is dropping `admin.initializeApp()` and the Realtime Database client connection. If ticket 09's measured cold start is still over ~1 s, that's the Worker follow-up.
- Tests: `cd functions && npm test` (12 tests).
