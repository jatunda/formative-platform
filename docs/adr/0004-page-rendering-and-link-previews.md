---
status: accepted
---

# Pages render dynamically, with a Cloud Function scoped to /p/** for link-preview metadata

Pages needed to satisfy two things that pull in opposite directions: edits should go live instantly with no rebuild step (matching how Lessons already work, reusing `dsl.js`/`content-renderer.js` client-side), and links shared in Google Classroom needed real per-page titles/descriptions in their preview cards. Link-preview crawlers fetch raw HTML without executing JavaScript, so a pure client-rendered page — the same static HTML shell for every Page — would show an identical, generic-looking preview no matter what the Page actually contains.

We chose to keep Pages fully client-rendered for the actual visitor experience, and added one narrowly-scoped Cloud Function (Firebase Hosting rewrites `/p/**` to it) that reads a Page's title from the database server-side and injects it into `<title>`/Open Graph tags before handing back the same client-rendered shell. This is the project's first server-side compute — previously everything was a static asset copy (`build.js`) served from Firebase Hosting, with the Firebase plan at the free Spark tier. Running this function requires upgrading to the Blaze (pay-as-you-go) plan, though expected usage keeps real cost near $0/month.

The alternative — reversing to true static generation (a publish step that renders each Page's DSL to real HTML files with baked-in meta tags, then deploys) — was rejected because it reintroduces a rebuild-before-it's-live step, working against the goal of spinning up and editing Pages quickly.

## Update (2026-10-22): long-cached shell, live data, and cold starts

Measured cold starts of the preview functions were ~2.3–2.7 s (warm ~0.17 s), paid by whichever student arrives after an idle gap — and the original 5-minute CDN cache made those gaps frequent. Since the function's only job is preview metadata, its response is now cached for a day (never for "not found", so a link shared before its target exists starts working once it does), and every piece of content the visitor actually sees is fetched live by the browser, so edits still go live on a normal refresh. For Practice Sets the shell also carries the Practice Set's id, saving the browser a Slug lookup, and the browser reads through the database's public REST API rather than loading the Firebase SDK.

The function is also slimmed to plain REST reads instead of `firebase-admin`, to shrink cold starts. Alternatives considered: an always-on minimum instance (~$3/month at the `gcf_gen1` CPU size, ~$8/month at the default 1 vCPU) and moving both functions to a Cloudflare Worker (no cold starts, free tier, but a second deploy platform; the domain's DNS is already on Cloudflare). The slimmed function is tried first; if its measured cold start is still over ~1 s, the Worker move follows and gets its own ADR.

## Update (2026-10-27): slimmed function measured; ~2 s cold start accepted for now

After the slimmed function deployed, cold starts measured ~1.9 s (`/practice`) and ~2.7 s (`/p`), still over the ~1 s line set above. Our code no longer uses `firebase-admin`, but `firebase-functions` still loads it at startup, so most of the cold start is Google starting the container and Node, not our code. Because the shell is now CDN-cached for a day, students rarely pay a cold start, so we accepted it rather than move to a Cloudflare Worker now. What was measured, which options were ruled out, and the remaining options (bundling, a merged function with a warm instance, the Worker) are in `.scratch/preview-function-cold-start/notes.md`.
