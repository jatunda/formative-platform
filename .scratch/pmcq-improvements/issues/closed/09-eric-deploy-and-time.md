# 09: Eric: deploy and time the cold start

**What to build:** The slimmed preview function and the fast load path are live, and you have a real cold-start number to decide whether the Cloudflare Worker follow-up is needed. The baseline from 2026-10-22: cold ~2.3 s (`/practice`), ~2.7 s (`/p`); warm ~0.16–0.18 s.

**Blocked by:** 06 (slim preview function), 07 (fast load path)

**Status:** closed

Steps:

1. From the repo root, on the branch with 06 and 07 merged: `firebase deploy --only functions,hosting`.
2. Right after deploying, check headers. Use a real Practice Set slug for `<slug>`:
   ```
   curl -sI "https://mrhsieh.app/practice/<slug>" | grep -i "cache-control"     # expect a day-long max-age
   curl -sI "https://mrhsieh.app/practice/zz-no-such-set?cb=$RANDOM" | grep -iE "^HTTP|cache-control"   # expect 404 + no-store/no-cache
   ```
3. Let the function sit unused for at least 30 minutes so it goes cold, then time it (the random `cb` value skips the CDN cache so the function actually runs):
   ```
   for p in practice p; do for i in 1 2 3; do curl -s -o /dev/null -w "$p run $i: %{http_code} first-byte %{time_starttransfer}s\n" "https://mrhsieh.app/$p/zz-timing-test?cb=$RANDOM$RANDOM"; done; done
   ```
   Run 1 of each is the cold start; runs 2–3 are warm.
4. Open a real Practice Set in the browser and confirm it loads, then edit one of its Questions in the teacher view and confirm a normal refresh shows the edit.
5. Record the numbers under **Comments** below.
6. If cold run 1 is still over ~1 s: ask Claude to open the Cloudflare Worker follow-up (new ticket + ADR). If it's under: the always-on and Worker options stay closed.

- [x] Deployed. Found pages return a day-long cache header, and "not found" returns 404 with no caching.
- [x] Cold and warm timings recorded below.
- [ ] Decision made on the Worker follow-up.
- [x] An edit shows up on a normal refresh.

## Comments

Deployed and timed by Eric (reported 2026-10-27). Headers and the edit-on-refresh check passed.

```
practice run 1: 404 first-byte 1.884749s   (cold)
practice run 2: 404 first-byte 0.330398s
practice run 3: 404 first-byte 0.176749s
p run 1: 404 first-byte 2.657357s          (cold)
p run 2: 404 first-byte 0.175190s
p run 3: 404 first-byte 0.155400s
```

Compared with the 2026-10-22 baseline: the `/practice` cold start went from ~2.3 s to ~1.9 s, and the `/p` cold start stayed at ~2.7 s. Warm requests are unchanged at ~0.16-0.18 s. Both cold starts are still over the ~1 s line, so by step 6 the follow-up is open. Eric hasn't yet picked between a warm instance, a plain Cloud Run service, and the Cloudflare Worker, so the "Decision made" box stays unticked. The day-long CDN cache already means far fewer requests reach a cold function.
