# AI Question Generation Setup

This feature allows you to generate formative assessment questions using AI (OpenAI's GPT models).

## Setup Instructions

1. **Get an OpenAI API Key**
   - Visit https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (it starts with `sk-`)

2. **Configure the Application**
   ```bash
   # Copy the template configuration file
   cp web/ai-config.template.js web/ai-config.js
   ```

3. **Add Your API Key**
   - Open `web/ai-config.js`
   - Replace `'your-openai-api-key-here'` with your actual API key
   - Save the file

4. **Test the Feature**
   - Open the editor in your browser
   - Click the "🤖 Generate Questions" button
   - Fill out the form and generate questions

## Usage

### Question Types

**Review Questions**
- 3-5 questions testing knowledge from previous lessons
- Focus on recall and comprehension
- Help cement learning

**Preview Questions** 
- 2-3 anticipatory questions about upcoming content
- Activate prior knowledge
- Spark curiosity and engagement

### Class Selection
- Choose from your configured classes
- System automatically uses appropriate grade level and subject
- Influences question complexity and content style

### Learning Objectives
- Describe what you want students to learn or review
- Be specific about concepts, skills, or topics
- Examples:
  - "Understanding for loops in Java"
  - "Variables and data types" 
  - "Basic algorithm design"

## Cost Information

- Uses OpenAI's GPT-3.5-turbo model by default (cheaper option)
- Typical cost: ~$0.001-0.003 per question generation
- Can upgrade to GPT-4 in `ai-config.js` for better quality (higher cost)

## Troubleshooting

**"AI Generation requires OpenAI API key configuration"**
- Make sure you've created `web/ai-config.js` from the template
- Verify your API key is correctly entered
- Check that your OpenAI account has available credits

**Generation fails or times out**
- Check your internet connection
- Verify your API key is valid and has credits
- Try again with shorter learning objectives

**Questions don't match your expectations**
- Be more specific in your learning objectives
- Try the "regenerate" option
- Consider switching to GPT-4 model for better results
