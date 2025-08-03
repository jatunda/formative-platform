const parseDSL = require("./parseMarkdown");
const lesson = parseDSL("content/000_test.md");
console.log(JSON.stringify(lesson, null, 2));