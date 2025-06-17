const Groq = require("groq-sdk");
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const ACTIVE_MODEL = "llama3-70b-8192";
const QUIZ_PROMPT_TEMPLATE = `As an expert quiz generator, create a {difficulty} level quiz for grade {grade} about {subject}.
Generate exactly {total_questions} multiple-choice questions with:
- Clear question text
- 4 options (a-d)
- Correct answer index (0-3)
- Brief explanation

Return valid JSON format:
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": 0,
      "explanation": "..."
    }
  ]
}`;

const HINT_PROMPT_TEMPLATE = `Provide a helpful hint for the following quiz question without giving away the answer:
Question: {question}

The hint should:
- Be 1-2 sentences
- Guide the student toward the correct thinking
- Not reveal the answer directly

Return just the hint text without any additional formatting or explanation.`;

async function generateQuiz(grade_level, subject, difficulty, total_questions = 5) {
  try {
    // Generate prompt
    const prompt = QUIZ_PROMPT_TEMPLATE
      .replace('{grade}', grade_level)
      .replace('{subject}', subject)
      .replace('{difficulty}', difficulty)
      .replace('{total_questions}', total_questions);

    // Call AI
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: ACTIVE_MODEL,
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    const quiz = JSON.parse(content);

    // Validate structure
    if (!quiz?.questions?.length || !quiz.title) {
      throw new Error("Invalid quiz format from AI");
    }

    return quiz;
  } catch (err) {
    console.error("AI Quiz generation error:", err);
    throw new Error("Failed to generate quiz: " + err.message);
  }
}

async function generateHint(question) {
  try {
    // Generate prompt
    const prompt = HINT_PROMPT_TEMPLATE.replace('{question}', question);

    // Call AI
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: ACTIVE_MODEL,
      temperature: 0.5,
      max_tokens: 100
    });

    const hint = completion.choices[0]?.message?.content?.trim();
    if (!hint) {
      throw new Error("No hint generated");
    }

    return hint;
  } catch (err) {
    console.error("AI Hint generation error:", err);
    return "Sorry, couldn't generate a hint for this question. Try reviewing the related concepts.";
  }
}

async function generateImprovementSuggestions({ quiz, score, total, weakAreas = [] }) {
  try {
    let prompt;
    if (weakAreas.length > 0) {
      prompt = `The student scored ${score}/${total} on a ${quiz} quiz. 
      They struggled with these areas: ${weakAreas.join(', ')}.
      Provide 2-3 specific suggestions to improve in these areas, formatted as bullet points.`;
    } else {
      prompt = `The student scored ${score}/${total} on a ${quiz} quiz and answered all questions correctly.
      Provide 2 suggestions for further advancement in this subject, formatted as bullet points.`;
    }

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: ACTIVE_MODEL,
      temperature: 0.3,
      max_tokens: 300
    });

    const suggestions = completion.choices[0]?.message?.content?.trim();
    if (!suggestions) {
      throw new Error("No suggestions generated");
    }

    return suggestions;
  } catch (err) {
    console.error("AI Suggestions generation error:", err);
    return "1. Review the quiz material thoroughly\n2. Practice similar questions to reinforce understanding";
  }
}

module.exports = { 
  generateQuiz,
  generateHint,
  generateImprovementSuggestions
};