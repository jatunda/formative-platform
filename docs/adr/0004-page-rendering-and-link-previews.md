---
status: accepted
---

# Pages render dynamically, with a Cloud Function scoped to /p/** for link-preview metadata

Pages needed to satisfy two things that pull in opposite directions: edits should go live instantly with no rebuild step (matching how Lessons already work, reusing `dsl.js`/`content-renderer.js` client-side), and links shared in Google Classroom needed real per-page titles/descriptions in their preview cards. Link-preview crawlers fetch raw HTML without executing JavaScript, so a pure client-rendered page — the same static HTML shell for every Page — would show an identical, generic-looking preview no matter what the Page actually contains.

We chose to keep Pages fully client-rendered for the actual visitor experience, and added one narrowly-scoped Cloud Function (Firebase Hosting rewrites `/p/**` to it) that reads a Page's title from the database server-side and injects it into `<title>`/Open Graph tags before handing back the same client-rendered shell. This is the project's first server-side compute — previously everything was a static asset copy (`build.js`) served from Firebase Hosting, with the Firebase plan at the free Spark tier. Running this function requires upgrading to the Blaze (pay-as-you-go) plan, though expected usage keeps real cost near $0/month.

The alternative — reversing to true static generation (a publish step that renders each Page's DSL to real HTML files with baked-in meta tags, then deploys) — was rejected because it reintroduces a rebuild-before-it's-live step, working against the goal of spinning up and editing Pages quickly.
