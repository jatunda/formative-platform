/**
 * Parse DSL (Domain-Specific Language) text into structured content format
 * 
 * DSL Format:
 * - Title: Line starting with "# " (hash and space)
 * - Questions: Separated by "---" on its own line
 * - Text: Regular text lines (processed for inline formatting)
 * - Code blocks: Enclosed in ``` (with optional language specification on opening)
 * 
 * @param {string} dslText - The DSL text to parse
 * @returns {Object} Parsed content object
 * @returns {string} returns.title - The lesson title
 * @returns {Array<Object>} returns.blocks - Array of question blocks
 * @returns {string} returns.blocks[].type - Block type ("question")
 * @returns {Array<Object>} returns.blocks[].content - Array of content items
 * @returns {string} returns.blocks[].content[].type - Content type ("text" or "code")
 * @returns {string} returns.blocks[].content[].value - The content value
 * @returns {string} [returns.blocks[].content[].language] - Language for code blocks (optional)
 * @example
 * parseDSL("# My Lesson\n\nSome text\n\n---\n\nMore text")
 */
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
          const codeBlock = { type: "code", value: codeBuffer.join("\n") };
          if (currentCodeLanguage !== undefined && currentCodeLanguage !== "") {
            codeBlock.language = currentCodeLanguage;
          }
          currentBlock.content.push(codeBlock);
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
      // Use raw line to preserve leading whitespace for indentation (needed for nested lists)
      if (inQuestion && currentBlock) {
        currentBlock.content.push({ type: "text", value: raw });
      }
    }
    
    // Ignore lines outside questions (except title and separators)
  }
  
  // Close any remaining question block that has content
  if (inQuestion && currentBlock && currentBlock.content.length > 0) {
    result.blocks.push(currentBlock);
  }
  
  // Filter out any empty blocks
  result.blocks = result.blocks.filter(block => block.content.length > 0);
  
  return result;
}

/**
 * Generate DSL text from structured content format (reverse of parseDSL)
 * 
 * @param {Object} content - The structured content object
 * @param {string} content.title - The lesson title
 * @param {Array<Object>} content.blocks - Array of question blocks
 * @returns {string} The DSL text representation
 */
export function generateDSLFromContent(content) {
  const lines = [];
  
  if (content.title) {
    lines.push(`# ${content.title}`, "");
  }
  
  // Filter out empty blocks and get only blocks with content
  const blocksWithContent = (content.blocks || []).filter(block => 
    block.type === "question" && block.content && block.content.length > 0
  );
  
  for (let i = 0; i < blocksWithContent.length; i++) {
    const block = blocksWithContent[i];
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
  return lines.join("\n");
}
