# 09: Eric: deploy and time the cold start

**What to build:** The slimmed preview function and the fast load path are live, and you have a real cold-start number to decide whether the Cloudflare Worker follow-up is needed. The baseline from 2026-10-22: cold ~2.3 s (`/practice`), ~2.7 s (`/p`); warm ~0.16–0.18 s.

**Blocked by:** 06 (slim preview function), 07 (fast load path)

**Status:** ready-for-agent

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

- [ ] Deployed. Found pages return a day-long cache header, and "not found" returns 404 with no caching.
- [ ] Cold and warm timings recorded below.
- [ ] Decision made on the Worker follow-up.
- [ ] An edit shows up on a normal refresh.

## Comments
