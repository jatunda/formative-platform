// Publishes a practice-mcq bank (vault markdown) as Questions plus one
// Practice Set. Each bank entry becomes a Question with Slug
// `<prefix>-q001`, ...; the Practice Set lives at `/practice/<prefix>-practice`.
// Re-running after a top-up publishes only entries whose Slug is still free
// and appends them to the existing Practice Set.
//
// The bank holds one explanation per question (used for the correct Option).
// Wrong Options' Explanations come from a JSON file beside the bank:
//   { "Q001": { "B": ["<student-facing explanation>", "<mistake category>"], ... }, ... }
//
// Dry run by default - validates everything and writes nothing:
//   node scripts/publishPracticeSet.js <bank.md> <explanations.json> --prefix cmu-u2a \
//     --title "CMU U2a Practice (2.1-2.4)" --class "AP Computer Science Principles" --topic "CMU U2a (2.1-2.4)"
// Actually publish (one atomic multi-path update):
//   ... --apply

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const admin = require("firebase-admin");
const serviceAccount = require("../firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});

const db = admin.database();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1 || !args[i + 1]) throw new Error(`Missing --${name}`);
  return args[i + 1];
};

/** Split a bank file into entries: { id, stemDsl, options: [{letter, text}], answer, explanation }. */
function parseBank(markdown) {
  return markdown.replace(/\r/g, "").split(/^### /m).slice(1).map((entry) => {
    const id = entry.split("\n")[0].trim();
    const section = (name, next) => entry.split(`**${name}:**`)[1].split(next)[0].trim();
    // A stem line starting "- " would read as an Option in the Question DSL,
    // so I/II/III statements become plain lines.
    const stemDsl = section("Question", "**Options:**")
      .split("\n").map((line) => line.replace(/^- (I{1,3}\. )/, "$1")).join("\n");
    const options = section("Options", "**Answer:**").split("\n")
      .filter((line) => /^- [A-D]\. /.test(line))
      .map((line) => ({ letter: line[2], text: line.slice(5).trim() }));
    return {
      id,
      stemDsl,
      options,
      answer: entry.match(/\*\*Answer:\*\* ([A-D])/)[1],
      explanation: section("Explanation", "**Distractors:**").replace(/\n+/g, " "),
    };
  });
}

(async () => {
  const [bankPath, explanationsPath] = args;
  const prefix = flag("prefix");
  const title = flag("title");
  const className = flag("class");
  const topic = flag("topic");
  const setSlug = `${prefix}-practice`;

  const { parseQuestionDSL } = await import(pathToFileURL(path.join(__dirname, "../web/question-dsl.js")).href);
  const { validateQuestionDSL } = await import(pathToFileURL(path.join(__dirname, "../web/question-dsl-validation.js")).href);
  const entries = parseBank(fs.readFileSync(bankPath, "utf8"));
  const wrongExplanations = JSON.parse(fs.readFileSync(explanationsPath, "utf8"));

  const [questions, questionSlugs, practiceSets, practiceSetSlugs, classes] = await Promise.all(
    ["questions", "questionSlugIndex", "practiceSets", "practiceSetSlugIndex", "classes"]
      .map((p) => db.ref(p).once("value").then((s) => s.val() || {}))
  );
  const classMatches = Object.entries(classes).filter(([, c]) => (c.name || "").trim() === className);
  if (classMatches.length !== 1) throw new Error(`Expected exactly one Class named "${className}", found ${classMatches.length}`);
  const classId = classMatches[0][0];

  const problems = [];
  const toPublish = [];
  for (const entry of entries) {
    const slug = `${prefix}-${entry.id.toLowerCase()}`;
    if (slug in questionSlugs) continue;
    const lines = [entry.stemDsl, ""];
    for (const { letter, text } of entry.options) {
      if (letter === entry.answer) {
        lines.push(`+ ${text}`, `    Explanation: ${entry.explanation}`, "");
        continue;
      }
      const [explanation, mistake] = wrongExplanations[entry.id]?.[letter] || [];
      lines.push(`- ${text}`, `    Explanation: ${explanation || ""}`, `    Mistake: ${mistake || ""}`, "");
    }
    lines.push(`Tags: ${className} | ${topic}`);
    const dsl = lines.join("\n");
    const parsed = parseQuestionDSL(dsl);
    const error = validateQuestionDSL(dsl, parsed);
    if (error) problems.push(`${entry.id}: ${error}`);
    else toPublish.push({ slug, record: { stem: parsed.stem, options: parsed.options, classId, topic } });
  }

  console.log(`${entries.length} bank entries; ${entries.length - toPublish.length - problems.length} already published; ${toPublish.length} to publish.`);
  if (problems.length) {
    console.log(`${problems.length} invalid - nothing written:`);
    problems.forEach((p) => console.log(`  ${p}`));
    process.exit(1);
  }
  if (toPublish.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  const newId = (existing) => {
    let id;
    do id = crypto.randomBytes(16).toString("hex"); while (id in existing);
    existing[id] = true;
    return id;
  };
  const updates = {};
  const newQuestionIds = toPublish.map(({ slug, record }) => {
    const id = newId(questions);
    updates[`questions/${id}`] = record;
    updates[`questionSlugIndex/${slug}`] = id;
    return id;
  });
  let setId = practiceSetSlugs[setSlug];
  if (setId) {
    const existing = practiceSets[setId];
    updates[`practiceSets/${setId}`] = { title: existing.title, questionIds: [...(existing.questionIds || []), ...newQuestionIds] };
    console.log(`Appending to existing Practice Set "${existing.title}" (${(existing.questionIds || []).length} Questions).`);
  } else {
    setId = newId(practiceSets);
    updates[`practiceSets/${setId}`] = { title, questionIds: newQuestionIds };
    updates[`practiceSetSlugIndex/${setSlug}`] = setId;
    console.log(`Creating Practice Set "${title}".`);
  }
  console.log(`Slugs ${toPublish[0].slug} .. ${toPublish[toPublish.length - 1].slug}; Practice Set at /practice/${setSlug}`);

  if (!apply) {
    console.log("Dry run - nothing written. Re-run with --apply to publish.");
    process.exit(0);
  }
  await db.ref().update(updates);
  const written = (await db.ref(`practiceSets/${setId}`).once("value")).val();
  console.log(`Published. Practice Set now holds ${written.questionIds.length} Questions.`);
  process.exit(0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
