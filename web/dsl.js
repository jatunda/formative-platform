export function parseDSL(dslText) {
  const lines = dslText.split("\n");

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

export function generateDSLFromContent(content) {
  const lines = [];

  if (content.title) {
    lines.push(`# ${content.title}`, "");
  }

  console.log(content.blocks)

  for (let i = 0; i < (content.blocks || []).length; i++) {
    const block = content.blocks[i];
    if (block.type === "question") {
      // Only add separator if this is NOT the first question
      if (i > 0) {
        lines.push("---");
      }
      
      for (const item of block.content) {
        if (item.type === "text") {
          lines.push(item.value);
        } else if (item.type === "code") {
          lines.push("```");
          lines.push(item.value);
          lines.push("```");
        }
      }
      lines.push(""); // Add blank line after each question
    }
  }

  return lines.join("\n");
}
