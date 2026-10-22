# 06: Slim, longer-cached preview function

**What to build:** The link-preview function behind `/p/<slug>` and `/practice/<slug>` starts faster and runs less often. It reads the slug index and title through the database's public REST API with plain `fetch` instead of loading `firebase-admin`. Found pages are cached for a day at the CDN, while "not found" responses are never cached, so a link shared before its target exists starts working once it does. The Practice Set shell also carries the resolved Practice Set id for the browser to use (ticket 07). Link previews in Google Classroom keep showing real titles.

See the spec (`../spec.md`): "Link-preview function", plus the ADR 0004 update.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Request handling for both routes is a pure function: request path plus an injected JSON-fetch function in, status + headers + HTML body out. A thin adapter wires it to Cloud Functions. Both exports stay, and their routes in the hosting config are unchanged.
- [ ] `firebase-admin` is no longer used, and is removed from the functions dependencies if nothing else needs it.
- [ ] Found: 200 with a day-long CDN cache header. Not found or no slug: 404 with no-store/no-cache.
- [ ] The Practice Set shell embeds the Practice Set id in a form the browser can read without parsing the title (a data attribute or small inline JSON; document which in the code). All interpolated values stay HTML-escaped.
- [ ] Tests use Node's built-in test runner inside `functions/`, with an injected fake fetch, and cover:
  - found and not found for both routes
  - cache headers for each
  - the embedded id
  - a title containing `<`, `"` and `&` escaped
- [ ] The test command is added to CLAUDE.md's "before considering done" checklist for changes under `functions/`.
- [ ] Not deployed by this ticket; deploy and timing are ticket 09.
