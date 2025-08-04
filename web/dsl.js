export function parseDSL(dslText) {
  const lines = dslText.split("\n");

  const result = {
    title: "",
    blocks: [],
  };

  let currentBlock = null;
  let inCode = false;
  let codeBuffer = [];
  let currentCodeLanguage = undefined;
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

    // Code block toggle (``` or ```language)
    else if (line === "```" || line.startsWith("```")) {
      // If we haven't started a question yet and no separator encountered, start one
      if (!inQuestion && !hasEncounteredSeparator) {
        inQuestion = true;
        currentBlock = { type: "question", content: [] };
      }
      
      if (inCode) {
        // End code block (language specification on closing ``` is ignored/invalid)
        if (currentBlock && inQuestion) {
          currentBlock.content.push({ type: "code", value: codeBuffer.join("\n"), language: currentCodeLanguage });
        }
        inCode = false;
        codeBuffer = [];
        currentCodeLanguage = undefined;
      } else {
        // Start code block, extract optional language
        inCode = true;
        codeBuffer = [];
        // Extract language from "```language" format (with or without space)
        if (line.length > 3) {
          // Remove the ``` prefix and any leading whitespace
          const languagePart = line.substring(3).trim();
          currentCodeLanguage = languagePart || undefined;
        } else {
          currentCodeLanguage = undefined;
        }
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
          // Include language specification if present
          if (item.language) {
            lines.push(`\`\`\`${item.language}`);
          } else {
            lines.push("```");
          }
          lines.push(item.value);
          lines.push("```");
        }
      }
      lines.push(""); // Add blank line after each question
    }
  }

  return lines.join("\n");
}
