const fs = require("fs");

const raw = fs.readFileSync("content/000_intro.md", "utf-8");
const blocks = raw.split("\n\n").map(block => block.trim());

blocks.forEach((block, idx) => {
  console.log(`Block ${idx + 1}:`);
  console.log(block);
  console.log("------");
});
