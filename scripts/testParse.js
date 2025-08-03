// This file is to test the parser and print its output. 
// To test, change the file being run, and rerun (npm path_to_this_file)

const parseDSL = require("./parseMarkdown");
const lesson = parseDSL("content/000_test.md");
console.log(JSON.stringify(lesson, null, 2));