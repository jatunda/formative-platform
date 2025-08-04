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

  for (let raw of lines) {
    const line = raw.trim();
    if (line === "" && !inCode) continue; // Allow empty lines in code blocks

    if (line.startsWith("@title")) {
      result.title = line.replace("@title", "").trim();
    }

    // Start of question block
    else if (line === "@beginq") {
      if (inQuestion) throw new Error("Nested @beginq found");
      inQuestion = true;
      currentBlock = { type: "question", content: [] };
    }

    // End of question block
    else if (line === "@endq") {
      if (!inQuestion || !currentBlock) throw new Error("Unexpected @endq");
      result.blocks.push(currentBlock);
      currentBlock = null;
      inQuestion = false;
    }

    // Code block toggles
    else if (line === "@code") {
      if (!inQuestion || !currentBlock) throw new Error("Code must be inside a question");
      if (inCode) throw new Error("Nested @code block");
      inCode = true;
      codeBuffer = [];
    }

    else if (line === "@endcode") {
      if (!inCode) throw new Error("Unexpected @endcode");
      currentBlock.content.push({ type: "code", value: codeBuffer.join("\n") });
      inCode = false;
    }

    // Text lines
    else if (line.startsWith("@text")) {
      if (!inQuestion || !currentBlock) throw new Error("@text must be inside a question");
      const value = line.replace("@text", "").trim();
      currentBlock.content.push({ type: "text", value });
    }

    // Code lines
    else if (inCode) {
      // Use raw line to preserve indentation in code blocks
      codeBuffer.push(raw);
    }

    else {
      throw new Error("Unexpected line: " + line);
    }
  }

  return result;
}

export function generateDSLFromContent(content) {
  const lines = [];

  if (content.title) {
    lines.push(`@title ${content.title}`, "");
  }

  console.log(content.blocks)

  for (const block of content.blocks || []) {
    if (block.type === "question") {
      lines.push("@beginq");
      for (const item of block.content) {
        if (item.type === "text") {
          lines.push(`@text ${item.value}`);
        } else if (item.type === "code") {
          lines.push("@code", ...item.value.split("\n"), "@endcode");
        }
      }
      lines.push("@endq", "");
    }
  }

  return lines.join("\n");
}
