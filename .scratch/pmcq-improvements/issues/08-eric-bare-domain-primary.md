# 08: Eric: make the bare domain primary

**What to build:** `mrhsieh.app` serves the site directly, and `www.mrhsieh.app` redirects to it. Today it's the reverse: the bare domain 301-redirects to `www.`, which costs every bare-domain link an extra round trip. This is a console change only Eric can make; there's no code.

**Blocked by:** None (can be done any time; independent of every code ticket)

**Status:** ready-for-agent

Steps (console labels may differ slightly):

1. Open the Firebase console → project **formative-platform** → **Hosting**.
2. In the custom domains list, find `mrhsieh.app` (currently set to redirect to `www.mrhsieh.app`). Use its menu → **Edit**, turn the redirect off, and save, so it serves the site directly.
3. Find `www.mrhsieh.app`. Use its menu → **Edit**, set it to redirect to `mrhsieh.app`, and save.
4. Leave the Cloudflare DNS records as they are. Both hostnames already point at Firebase Hosting with DNS-only (gray cloud), and both already have certificates.
5. Wait a few minutes, then check from any terminal:
   ```
   curl -sI https://mrhsieh.app/ | head -1                      # expect HTTP/2 200
   curl -sI https://www.mrhsieh.app/ | grep -i location         # expect location: https://mrhsieh.app/
   ```
6. From now on, share `mrhsieh.app/...` links. Old `www.` links keep working through the redirect.

- [ ] `https://mrhsieh.app/` returns 200 directly.
- [ ] `https://www.mrhsieh.app/...` redirects to the same path on `https://mrhsieh.app/`.
- [ ] A Practice Set link and a `/p/` Page link both load on the bare domain.
