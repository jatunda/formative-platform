const fs = require("fs");

function parseDSL(filePath) {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");

  const result = {
    title: "",
    blocks: [],
  };

  let currentBlock = null;
  let inCode = false;
  let codeBuffer = [];
  let inQuestion = false;

  for (let raw of lines) {
    const line = raw.trim();
    if (line === "") continue;

    if (line.startsWith("@title")) {
      result.title = line.replace("@title", "").trim();
    }

    // Start of question block
    else if (line === "@beginq") {
      inQuestion = true;
      currentBlock = { type: "question", content: [] };
    }

    // End of question block
    else if (line === "@endq") {
      result.blocks.push(currentBlock);
      currentBlock = null;
      inQuestion = false;
    }

    // Start/End of code
    else if (line === "@code") {
      inCode = true;
      codeBuffer = [];
    } else if (line === "@endcode") {
      if (!inCode) throw new Error("Unexpected @endcode");
      currentBlock.content.push({ type: "code", value: codeBuffer.join("\n") });
      inCode = false;
    }

    // Text or reuse inside questions
    else if (line.startsWith("@text")) {
      const value = line.replace("@text", "").trim();
      currentBlock.content.push({ type: "text", value });
    }

    // While in a snippet, treat lines as text
    else if (currentBlock?.type === "snippet") {
      result.snippets[currentBlock.id] += line + " ";
    }

    // Collect code lines
    else if (inCode) {
      codeBuffer.push(line);
    }

    else {
      throw new Error("Unexpected line outside any block: " + line);
    }
  }

  return result;
}

module.exports = parseDSL;
