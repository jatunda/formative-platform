import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { AI_CONFIG } from "./ai-config.js";
import { parseDSL } from "./dsl.js";

// Class metadata mapping (hard-coded for MVP)
const CLASS_METADATA = {
  // Computer Science A classes
  'csa': { 
    subject: 'Computer Science A', 
    gradeLevel: 11,
    promptInstructions: 
`For AP Computer Science A questions: 
- Create questions using the AP style and wording

For Java programming questions:
- Include a mix of code reading and code writing questions
- Focus on syntax precision and common Java patterns
- Reference the AP CSA course terminology where appropriate
- Include at least one question about common errors or debugging

When creating the titles for problem sets: 
- If there is a provided topic, please include that topic in the title
- if the topic number is not provided, please use the appropriate topic number from the CSAwesome2 textbook
- The title format should be as follows: "CSA {topic number} - {lesson title} {question set type}". For example "CSA 3.4 - Writing Constructors Review"
`,
    exampleQuestions: {
      review: 
`# CSA 2.8 For Loops Review

## Mild
What are the two types of loops in java? When would you use one over the other?

---

## Medium
Consider the following code segment.
\`\`\`java
for (int m = 16; m > 0; m -= 2) 
{
	if ((m % 3) == 1) 
	{
		System.out.print(m + " ");
	}
}
\`\`\`
What is printed as a result of executing this code segment?

---

## Medium
Consider the following code segment.
\`\`\`java
String str = "qrstu";
String result = "";
for (int j = 0; j < str.length(); j++) 
{
	result += str.substring(0, j + 1);
}
System.out.println(result);
\`\`\`
What is printed as a result of executing this code segment? If nothing is printed, explain why.

---

## Spicy
Consider the following code segment. Assume that the \`int\` variable \`input\` has been properly declared and initialized.
\`\`\`java
int answer = 1;
if (input !=0) 
{
	int count = 1;
	while (count != input)
	{
		count++;
		answer *= count;
	}
}
System.out.println(answer);
\`\`\`
Under what conditions does the code segment always result in integer overflow?

---

## Spicy
Consider the following code segment.

\`\`\`java
for (int j = 1; j <= 4; j++) 
{
	for (int k = j + 1; k >= 1; k--) 
	{
		System.out.print(j + " ");
	}
	System.out.println();
}
\`\`\`
The code segement is intended to produce the following output, but does not work as intended.
\`\`\`
1
2 2
3 3 3
4 4 4 4
\`\`\`
What change should be made so that the code segment works as intended?


# CSA 1.1-1.4 Coding Introduction Review

## Mild

A student wrote a program to calculate the average of several numeric scores. The program compiles without error but produces incorrect results when it runes. The student suspects there is a logic error in the code. 
What strategies would you use to help you identify the logic error? 

--- 

## Mild

Consider the following variable declaration.
\`\`\`java
int x;
\`\`\`
What are 3 very different values that can be stored in the variable \`x\`? What are 3 very different values that cannot be?  

---

## Medium

The following code segment contains an error. 
\`\`\`java
double pi = 3.14;     // line 1
pi = 3.14159;         // line 2
double other = null;  // line 3
double example;       // line 4
example = pi;         // line 5
\`\`\`
Which line has the error? How would you describe the error? 

`,
      preview: 
`# Introduction to Inheritance

What might be some real-world examples where one thing "inherits" properties from another thing?

---
In a video game, if you were designing different types of characters that all need to move and take damage, what properties or behaviors would they share?`
    }
  },
  
  // Computer Science Principles classes  
  'csp': { 
    subject: 'Computer Science Principles', 
    gradeLevel: 10,
    promptInstructions: `For CSP questions:
- The title format should be as follows: "CSP {topic number} - {lesson title} {question set type}". For example "CSA 2.4 - DNS & HTTP Review". If a topic number is not given, do not include it.
- Use pseudocode that follows the AP CSP exam format
- Include questions about both coding and computing concepts
- Focus on algorithmic thinking and problem decomposition
- Reference real-world applications of computing concepts
- Include visualization or flowchart questions where appropriate`,
    exampleQuestions: {
      review: 
 `# Binary Numbers Review

How many different values can be represented with 3 bits? List them all.

---
What is the largest decimal number that can be represented with 4 bits?

---

What is 125 in binary?

# Setting and Accessing Lists Review 

Consider the following code segment. 
\`\`\`APCSP
firstList <- ["guitar", "drums", "bass"]
secondList <- ["flute", "violin"]
thirdList <- []
thirdList <- firstList
firstList <- secondList
secondList <- thirdList
\`\`\`

What are the contents of each of the lists after the code segment is executed?

---

The list \`wordList\` contains a list of 3 string values. What are all the valid indexes for the list? 

---

Assume that both lists and strings are indexed starting with index \`1\`.
The list \`wordList\` has the following contents.
\`\`\`APCSP
["abc", "def", "ghi", "jkl"]
\`\`\`
Let \`myWord\` be the element at index \`3\` of \`wordList\`. Let \`myChar\` be the character at index \`2\` of \`myWord\`. What is the value of \`myChar\`?
`,
      preview: `# Introduction to Algorithms

In your daily life, what are some step-by-step instructions you follow? Think about making a sandwich or getting ready for school.

---
If you were explaining to a friend how to tie their shoes, how would you break it down into simple steps?`
    }
  },
  
  // Engineering classes
  'engr7': { 
    subject: 'Engineering', 
    gradeLevel: 7,
    promptInstructions: `For 7th grade Engineering questions:
- Include hands-on design thinking scenarios
- Focus on measurement and spatial reasoning
- Include sketching and drawing interpretation questions
- Reference real tools and materials students use in class
- Include safety considerations where relevant`,
    exampleQuestions: {
      review: `# Engineering Design Process Review

What are the main steps of the engineering design process? List them in order.

---
Why is it important to test and iterate on your design?`,
      preview: `# Introduction to 3D Printing

What objects in your room might be difficult to make without 3D printing?

---
How do you think a 3D printer knows what shape to create?`
    }
  },
  'engr8': { 
    subject: 'Engineering', 
    gradeLevel: 8,
    promptInstructions: `For 8th grade Engineering questions:
- Focus on systematic troubleshooting approaches
- Include questions about proper tool usage and safety
- Reference specific components students work with
- Include documentation and technical communication skills`,
    exampleQuestions: {
      review: `# Circuit Components Review

What is the difference between a series and parallel circuit? Draw or describe each.

---
In a simple circuit with a battery and LED, what is the purpose of a resistor?`,
      preview: `# Introduction to Robotics

What tasks in your daily life would you want a robot to help with?

---
What sensors might a robot need to safely navigate around a room?`
    }
  },
};

// Abstract LLM interface for easy switching
class LLMProvider {
  async generateQuestions(prompt) {
    throw new Error('generateQuestions must be implemented by subclass');
  }
}

class OpenAIProvider extends LLMProvider {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
  }

  async generateQuestions(prompt) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator specializing in formative assessments. You create engaging questions that help students learn effectively.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        max_tokens: AI_CONFIG.MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

export class AIQuestionGenerator {
  constructor(database, apiKey) {
    this.db = database;
    this.llmProvider = new OpenAIProvider(apiKey);
    this.modal = null;
    this.classSelect = null;
    this.setupUI();
  }

  setupUI() {
    // Get UI elements
    this.modal = document.getElementById('aiGenerationModal');
    this.classSelect = document.getElementById('aiClassSelect');
    const generateBtn = document.getElementById('generateAIBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const generateModalBtn = document.getElementById('generateBtn');

    // Setup event listeners
    generateBtn.addEventListener('click', () => this.showModal());
    closeBtn.addEventListener('click', () => this.hideModal());
    cancelBtn.addEventListener('click', () => this.hideModal());
    generateModalBtn.addEventListener('click', () => this.generateQuestions());

    // Close modal on outside click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hideModal();
      }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'block') {
        this.hideModal();
      }
    });

    // Load classes when component initializes
    this.loadClasses();
  }

  async loadClasses() {
    try {
      const snapshot = await get(ref(this.db, 'classes'));
      const classes = snapshot.val();
      
      if (!classes) {
        console.warn('No classes found in database');
        return;
      }

      // Clear existing options
      this.classSelect.innerHTML = '<option value="">Select a class...</option>';

      // Sort classes by displayOrder and populate dropdown
      Object.entries(classes)
        .sort(([, a], [, b]) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .forEach(([id, classData]) => {
          const option = document.createElement('option');
          option.value = id;
          
          // Get metadata for this class
          const metadata = this.getClassMetadata(id, classData.name);
          option.textContent = `${classData.name} (${metadata.subject}, Grade ${metadata.gradeLevel})`;
          option.dataset.subject = metadata.subject;
          option.dataset.gradeLevel = metadata.gradeLevel;
          
          this.classSelect.appendChild(option);
        });

    } catch (error) {
      console.error('Error loading classes:', error);
      this.showError('Failed to load classes from database');
    }
  }

  getClassMetadata(classId, className) {
    // Try to find metadata by exact class ID first
    if (CLASS_METADATA[classId]) {
      return CLASS_METADATA[classId];
    }

    // Try to infer from class name patterns
    const name = className.toLowerCase();
    if (name.includes('csa') || name.includes('computer science a')) {
      return { subject: 'Computer Science A', gradeLevel: 11 };
    }
    if (name.includes('csp') || name.includes('computer science p')) {
      return { subject: 'Computer Science Principles', gradeLevel: 10 };
    }
    if (name.includes('engr') || name.includes('engineering')) {
      const grade = name.match(/(\d+)/)?.[1] || '9';
      return { subject: 'Engineering', gradeLevel: parseInt(grade) };
    }

    // Default fallback
    return { subject: 'General', gradeLevel: 9 };
  }

  showModal() {
    this.modal.style.display = 'block';
    // Focus on first input
    const firstRadio = document.querySelector('input[name="questionType"]');
    if (firstRadio) firstRadio.focus();
  }

  hideModal() {
    this.modal.style.display = 'none';
    this.hideError();
    this.hideLoading();
  }

  showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('generateBtn').disabled = true;
  }

  hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('generateBtn').disabled = false;
  }

  showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorState').style.display = 'block';
  }

  hideError() {
    document.getElementById('errorState').style.display = 'none';
  }

  // Generate a unique hash that's not in the database
  async generateUniqueHash() {
    const hashLength = 8;
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    
    while (true) {
      // Generate a random hash
      let hash = '';
      for (let i = 0; i < hashLength; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Check if this hash exists in the database
      const snapshot = await get(ref(this.db, `content/${hash}`));
      if (!snapshot.exists()) {
        return hash;
      }
    }
  }

  async generateQuestions() {
    try {
      // Validate inputs
      const questionType = document.querySelector('input[name="questionType"]:checked')?.value;
      const selectedClass = this.classSelect.value;
      const learningObjectives = document.getElementById('learningObjectives').value.trim();

      if (!questionType) {
        this.showError('Please select a question type (Review or Preview)');
        return;
      }

      if (!selectedClass) {
        this.showError('Please select a class');
        return;
      }

      if (!learningObjectives) {
        this.showError('Please enter learning objectives or topic');
        return;
      }

      // Generate a unique content ID
      const contentId = await this.generateUniqueHash();

      // Get class metadata
      const selectedOption = this.classSelect.selectedOptions[0];
      const classMetadata = {
        subject: selectedOption.dataset.subject,
        gradeLevel: parseInt(selectedOption.dataset.gradeLevel),
        name: selectedOption.textContent
      };

      this.showLoading();
      this.hideError();

      // Generate prompt
      const prompt = this.buildPrompt(questionType, classMetadata, learningObjectives);
      
      // Call LLM
      const generatedContent = await this.llmProvider.generateQuestions(prompt);
      
      // Insert into editor with the unique content ID
      this.insertIntoEditor(generatedContent, contentId);
      
      // Enable editing in the editor
      setEditingEnabled(true);
      
      // Update dropdown list to include the new content
      await this.updateContentList(contentId);
      
      // Close modal
      this.hideModal();

    } catch (error) {
      console.error('Generation error:', error);
      this.showError(`Generation failed: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  buildPrompt(questionType, classMetadata, learningObjectives) {
    const isReview = questionType === 'review';
    const questionCount = isReview ? '3-5' : '2-3';
    const questionStyle = isReview 
      ? 'recall and comprehension questions that test knowledge students should already have learned'
      : 'anticipatory questions that activate prior knowledge and spark curiosity about upcoming content';
    
    // Find the class metadata and examples based on the selected class
    const classKey = Object.keys(CLASS_METADATA).find(key => 
      CLASS_METADATA[key].subject === classMetadata.subject && 
      CLASS_METADATA[key].gradeLevel === classMetadata.gradeLevel
    );
    
    // Get example questions for this class and question type
    const exampleQuestions = classKey ? 
      CLASS_METADATA[classKey].exampleQuestions?.[questionType] : 
      null;

    return `Create ${questionCount} formative assessment questions for a ${classMetadata.subject} class at Grade ${classMetadata.gradeLevel} level.

Question Type: ${questionType.toUpperCase()}
${isReview ? 
  'These should be REVIEW questions - ' + questionStyle :
  'These should be PREVIEW questions - ' + questionStyle
}

Learning Objectives/Topic:
${learningObjectives}

Requirements:
- Generate questions in the following DSL format
- Start with a title line using # followed by the title
- Separate each question with exactly "---" on its own line
- Include code blocks using \`\`\` when relevant for ${classMetadata.subject}
- Make questions appropriate for Grade ${classMetadata.gradeLevel} students
- ${isReview ? 'Focus on testing understanding of concepts students have already learned' : 'Design questions that students can begin reasoning about even if they haven\'t learned the full topic yet'}
- Questions should increase in difficulty. Easy questions should be under the heading "## Mild", medium questions should be under the heading "## Medium" and hard questions should be under the headding "## Spicy"'
- There should be at least 1 question of each difficulty
- Easy questions should focus on definitions, factual recall, identifying elements, and explaining basic concepts, with questions that are self-contained and use familiar examples.
- Medium questions should focus on applying concepts to familiar situations, explaining relationships between ideas, or adapting known solutions, like reading or writing code similar to what they have seen before, with slight variations. 
- Hard questions should involve novel contexts, combining multiple concepts, or designing from scratch, and should focus on adaptation, far transfer, and creative problem solving. 
- Avoid repeating the same question at multiple difficulties—each should introduce new cognitive demands
- Vary question formats—include direct questions, short coding tasks, “explain why” prompts, and design challenges
- Cover the topic across all three difficulty levels, ensuring each higher level builds on skills from lower levels


DSL Format Example:
# Title Here

## Mild
First question text here?

---
## Medium
Second question with code:

\`\`\`java
// code example if relevant
\`\`\`

What does this code do?

---
## Spicy
Third question text here?

${classKey && CLASS_METADATA[classKey].promptInstructions ? 
  `\nClass-Specific Instructions:\n${CLASS_METADATA[classKey].promptInstructions}\n` : 
  ''}


Example questions for this class and question type:
${exampleQuestions || `# Example Title

First example question that demonstrates good questioning style for ${classMetadata.subject}?

---
Second example question that shows appropriate depth for Grade ${classMetadata.gradeLevel}?`}

Now generate new questions following this style for the learning objectives above:`;
  }

  insertIntoEditor(content, contentId) {
    const dslInput = document.getElementById('dslInput');
    const contentIdEl = document.getElementById('contentId');
    
    if (dslInput) {
      // Format the AI-generated content to ensure it follows DSL format
      let formattedContent = content;
      
      // Ensure there's no extra whitespace between lines
      formattedContent = formattedContent.trim().split(/\n\s*\n/).join('\n\n');
      
      // Make sure separator lines are exactly "---" with no extra whitespace
      formattedContent = formattedContent.replace(/\n\s*-+\s*\n/g, '\n\n---\n\n');
      
      // Ensure code blocks are properly formatted
      formattedContent = formattedContent.replace(/```(\w*)\s*\n/g, '```$1\n');
      formattedContent = formattedContent.replace(/\n\s*```\s*\n/g, '\n```\n');
      
      dslInput.value = formattedContent;
      
      // Set the content ID
      if (contentIdEl) {
        contentIdEl.textContent = contentId;
      }
      
      // Trigger the existing preview update
      const event = new Event('input', { bubbles: true });
      dslInput.dispatchEvent(event);
      
      // Focus on the editor
      dslInput.focus();
      
      // Verify the content is parseable
      try {
        parseDSL(formattedContent);
      } catch (error) {
        console.error('Generated content may not be in correct DSL format:', error);
      }
    }
  }

  async updateContentList(contentId) {
    // Get the select element
    const existingContentSelect = document.getElementById('existingContent');
    if (!existingContentSelect) return;

    // Clear the select value since this is unsaved content
    existingContentSelect.value = "";
  }
}
