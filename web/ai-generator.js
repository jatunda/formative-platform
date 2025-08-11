import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
import { AI_CONFIG } from "./ai-config.js";

// Class metadata mapping (hard-coded for MVP)
const CLASS_METADATA = {
  // Computer Science A classes
  'csa': { subject: 'Computer Science A', gradeLevel: 11 },
  
  // Computer Science Principles classes  
  'csp': { subject: 'Computer Science Principles', gradeLevel: 10 },
  
  // Engineering classes
  'engr7': { subject: 'Engineering', gradeLevel: 7 },
  'engr8': { subject: 'Engineering', gradeLevel: 8 },
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
      
      // Insert into editor
      this.insertIntoEditor(generatedContent);
      
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

DSL Format Example:
# Title Here

First question text here?

---
Second question with code:

\`\`\`java
// code example if relevant
\`\`\`

What does this code do?

---
Third question text here?

Generate the complete DSL content now:`;
  }

  insertIntoEditor(content) {
    const dslInput = document.getElementById('dslInput');
    if (dslInput) {
      dslInput.value = content;
      
      // Trigger the existing preview update
      const event = new Event('input', { bubbles: true });
      dslInput.dispatchEvent(event);
      
      // Focus on the editor
      dslInput.focus();
    }
  }
}
