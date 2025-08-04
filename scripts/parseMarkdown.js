// This file is provides a function that takes in our markdown files which are written
// in a domain specific language (DSL) for our lessons, and parses them for our database. 
// To see the spec for our DSL, see the README

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
  let hasEncounteredSeparator = false;

  for (let raw of lines) {
    const line = raw.trim();
    if (line === "" && !inCode) continue; // Allow empty lines in code blocks

    // Title line starts with #
    if (line.startsWith("# ")) {
      result.title = line.replace("# ", "").trim();
    }

    // Question separator (---)
    else if (line === "---") {
      hasEncounteredSeparator = true;
      if (inQuestion && currentBlock) {
        // End current question and push it
        result.blocks.push(currentBlock);
      }
      // Always start a new question after ---
      inQuestion = true;
      currentBlock = { type: "question", content: [] };
    }

    // Code block toggle (```)
    else if (line === "```") {
      // If we haven't started a question yet and no separator encountered, start one
      if (!inQuestion && !hasEncounteredSeparator) {
        inQuestion = true;
        currentBlock = { type: "question", content: [] };
      }
      
      if (inCode) {
        // End code block
        if (currentBlock && inQuestion) {
          currentBlock.content.push({ type: "code", value: codeBuffer.join("\n") });
        }
        inCode = false;
        codeBuffer = [];
      } else {
        // Start code block
        inCode = true;
        codeBuffer = [];
      }
    }

    // Collect code lines
    else if (inCode) {
      // Use raw line to preserve indentation in code blocks
      codeBuffer.push(raw);
    }

    // Regular text lines
    else if (line.length > 0) {
      // If we haven't started a question yet and no separator encountered, start one
      if (!inQuestion && !hasEncounteredSeparator) {
        inQuestion = true;
        currentBlock = { type: "question", content: [] };
      }
      
      // Add text to current question if we're in one
      if (inQuestion && currentBlock) {
        currentBlock.content.push({ type: "text", value: line });
      }
    }

    // Ignore lines outside questions (except title and separators)
  }

  // Close any remaining question block
  if (inQuestion && currentBlock) {
    result.blocks.push(currentBlock);
  }

  return result;
}

module.exports = parseDSL;

module.exports = parseDSL;
