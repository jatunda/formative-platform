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
  let collapsibleStack = []; // Track open collapsible sections: [{ section: object, depth: number }]
  let lastContentAddedToCollapsible = false; // Track if last content was added to a collapsible
  
  for (let raw of lines) {
    const line = raw.trim();
    if (line === "" && !inCode) continue; // Allow empty lines in code blocks
    
    // Title line starts with #
    if (line.startsWith("# ")) {
      result.title = line.replace("# ", "").trim();
    }
    
    // Question separator (---)
    else if (line === "---") {
      // Check for unclosed collapsible sections before starting new question
      if (collapsibleStack.length > 0) {
        const unclosedSections = collapsibleStack.map((entry, index) => {
          const title = entry.section.title || '(no title)';
          return `  ${index + 1}. "${title}"`;
        }).join('\n');
        
        throw new Error(
          `Unclosed collapsible section(s) detected before question separator. All collapsible sections must be explicitly closed with <<<.\n\n` +
          `Unclosed sections:\n${unclosedSections}\n\n` +
          `Please add <<< to close each opened collapsible section before the --- separator.`
        );
      }
      
      lastContentAddedToCollapsible = false;
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
          // If we're inside a collapsible section, add to the top of the stack
          if (collapsibleStack.length > 0) {
            collapsibleStack[collapsibleStack.length - 1].section.content.push(codeBlock);
            lastContentAddedToCollapsible = true;
          } else {
            currentBlock.content.push(codeBlock);
            lastContentAddedToCollapsible = false;
          }
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
    
    // Collapsible section closing marker (<<<)
    // Must check after inCode to avoid treating <<< inside code blocks as markers
    else if (line === "<<<" && !inCode) {
      // Close the current collapsible section if one is open
      if (collapsibleStack.length > 0) {
        collapsibleStack.pop();
        lastContentAddedToCollapsible = false;
      }
      // Skip processing this line further (don't treat as regular text)
      continue;
    }
    
    // Collapsible section marker (>>> or >>>!)
    // Must check after inCode to avoid treating >>> inside code blocks as markers
    else if (line.startsWith(">>>")) {
      // If we haven't started a question yet and no separator encountered, start one
      if (!inQuestion && !hasEncounteredSeparator) {
        inQuestion = true;
        currentBlock = { type: "question", content: [] };
      }
      
      if (inQuestion && currentBlock) {
        // Determine if expanded (has ! after >>>)
        const isExpanded = line.startsWith(">>>!");
        
        // Extract title (everything after >>> or >>>! and optional space)
        let title = "";
        if (isExpanded) {
          title = line.substring(4).trim(); // Skip ">>>!"
        } else {
          title = line.substring(3).trim(); // Skip ">>>"
        }
        
        // When we encounter a new collapsible marker:
        // - If stack is empty: it's a top-level collapsible (sibling to any previous ones)
        // - If stack has items: it's nested inside the current collapsible
        //
        // For top-level siblings: when stack is empty, we just add to block.
        // But if stack has 1 item at depth 0, we're inside a top-level collapsible, so new >>> is nested.
        //
        // The key insight: we only create siblings when the stack is completely empty.
        // If stack has any items, the new collapsible is nested.
        
        // Only close current collapsible if we're creating a top-level sibling (stack will be empty)
        // This means: if stack is empty, we're adding a sibling. If stack has items, it's nested.
        // But wait - if stack has 1 item at depth 0, and we see another >>>, should it be sibling or nested?
        //
        // Based on the tests:
        // - "multiple consecutive" expects siblings (both at top level)
        // - "nested" expects nested (second inside first)
        //
        // The difference: in "nested", there's content between the two >>> markers.
        // In "consecutive", they might be back-to-back or the first has content.
        //
        // Actually, I think the rule is simpler: if stack is empty, add sibling. If stack has items, add nested.
        // But for "consecutive siblings", we need to close the first one when we see the second.
        //
        // Let's try: if stack has exactly 1 item at depth 0, and we're adding a new top-level,
        // close the current one first to make it a sibling.
        
        // Check if we should close current to make a sibling
        // This happens when: stack has 1 item, that item is at depth 0, and we want a top-level sibling
        // But we can't know "we want a sibling" from syntax. So the heuristic: if stack has 1 item
        // at depth 0, and the last content added was to that collapsible, keep it nested.
        // If no content was added yet, it might be a sibling.
        //
        // Actually, simplest: only close if stack is empty. Otherwise, always nest.
        // For consecutive siblings, the first one gets closed when we see the second, but only if
        // we're treating them as siblings. But we need a way to know...
        //
        // Let me try a different approach: track if we've added content to the current collapsible.
        // If we have, new >>> is nested. If we haven't, new >>> might be a sibling.
        
        // For now, let's use this rule: if stack is empty, it's a sibling. If stack has items, it's nested.
        // But we need to handle the "consecutive siblings" case. Let's check: if stack has 1 item at depth 0,
        // and that item has no content yet, close it and make a sibling. Otherwise, nest.
        
        // Determine if this should be a sibling or nested:
        // - If stack is empty: it's a top-level collapsible (sibling to any previous ones)
        // - If stack has items: it's nested inside the current collapsible
        //
        // The rule: consecutive `>>>` at top level are nested (not siblings).
        // If stack is empty, new collapsible is top-level. If stack has items, it's nested.
        
        // Create new collapsible section
        const newCollapsible = {
          type: "collapsible",
          title: title || "",
          expanded: isExpanded,
          content: []
        };
        
        // Determine where to add this collapsible
        if (collapsibleStack.length > 0) {
          // We're inside a collapsible's content, so this becomes nested
          // Add to parent collapsible's content
          collapsibleStack[collapsibleStack.length - 1].section.content.push(newCollapsible);
        } else {
          // We're at top level, add to current block's content
          currentBlock.content.push(newCollapsible);
        }
        
        // Push to stack (this becomes the new "current" collapsible)
        const newDepth = collapsibleStack.length;
        collapsibleStack.push({ section: newCollapsible, depth: newDepth });
        
        // Reset the flag - we just created a new collapsible, so next content will go into it
        lastContentAddedToCollapsible = false;
      }
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
        // If we're inside a collapsible section, add to the top of the stack
        if (collapsibleStack.length > 0) {
          collapsibleStack[collapsibleStack.length - 1].section.content.push({ type: "text", value: raw });
          lastContentAddedToCollapsible = true;
        } else {
          currentBlock.content.push({ type: "text", value: raw });
          lastContentAddedToCollapsible = false;
        }
      }
    }
    
    // Ignore lines outside questions (except title and separators)
  }
  
  // Check for unclosed collapsible sections and throw error
  if (collapsibleStack.length > 0) {
    const unclosedSections = collapsibleStack.map((entry, index) => {
      const title = entry.section.title || '(no title)';
      return `  ${index + 1}. "${title}"`;
    }).join('\n');
    
    throw new Error(
      `Unclosed collapsible section(s) detected. All collapsible sections must be explicitly closed with <<<.\n\n` +
      `Unclosed sections:\n${unclosedSections}\n\n` +
      `Please add <<< to close each opened collapsible section.`
    );
  }
  
  lastContentAddedToCollapsible = false;
  
  // Close any remaining question block that has content
  if (inQuestion && currentBlock && currentBlock.content.length > 0) {
    result.blocks.push(currentBlock);
  }
  
  // Filter out any empty blocks
  result.blocks = result.blocks.filter(block => block.content.length > 0);
  
  return result;
}

/**
 * Serialize content items to DSL lines (recursive helper for collapsible sections)
 * @param {Array<Object>} contentItems - Array of content items
 * @param {Array<string>} lines - Array to append lines to
 * @private
 */
function serializeContentItems(contentItems, lines) {
  for (const item of contentItems) {
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
    } else if (item.type === "collapsible") {
      // Output collapsible marker
      const marker = item.expanded ? ">>>!" : ">>>";
      if (item.title && item.title.trim()) {
        lines.push(`${marker} ${item.title}`);
      } else {
        lines.push(marker);
      }
      // Recursively serialize nested content
      serializeContentItems(item.content, lines);
      // Output explicit closing marker for clarity (optional, but helpful)
      lines.push("<<<");
    }
  }
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
    
    serializeContentItems(block.content, lines);
    lines.push(""); // Add blank line after each question
  }
  return lines.join("\n");
}
