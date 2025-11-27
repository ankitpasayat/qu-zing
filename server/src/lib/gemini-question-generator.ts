import { Question } from '../types/game.js';
import { logger } from './logger.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface QuestionGenerationParams {
  count: number;
  categories?: string[];
  difficulties?: ('easy' | 'medium' | 'hard')[];
  signal?: AbortSignal;
}

/**
 * Generate trivia questions using Google Gemini API (FREE!)
 * Get your free API key: https://aistudio.google.com/app/apikey
 * 
 * Free tier: 15 RPM, 1 million tokens/day - very generous!
 */
export async function generateQuestionsWithGemini(
  params: QuestionGenerationParams
): Promise<Question[]> {
  // Read API key at runtime, not at module load time
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    logger.warn('GOOGLE_API_KEY not set');
    throw new Error('Gemini API key not configured');
  }

  const { count, categories, difficulties, signal } = params;

  // Check if already aborted
  if (signal?.aborted) {
    throw new DOMException('Question generation cancelled', 'AbortError');
  }

  // Calculate distribution optimized for fun and engagement
  const targetMC = Math.floor(count * 0.4);   // 40% - core gameplay
  const targetTF = Math.floor(count * 0.25);  // 25% - quick & engaging
  const targetMOL = Math.floor(count * 0.3);  // 30% - most fun, creates debates
  const targetNum = count - targetMC - targetTF - targetMOL; // ~5% - keep minimal

  const prompt = createPrompt({
    multipleChoice: targetMC,
    trueFalse: targetTF,
    moreOrLess: targetMOL,
    numerical: targetNum,
    categories,
    difficulties,
  });

  try {
    logger.info('Generating questions with Gemini (FREE)', { count });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a trivia question generator. Generate high-quality, interesting trivia questions with accurate answers and explanations. Respond with ONLY valid JSON, no other text.\n\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Gemini API error', { status: response.status, error: errorText });
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content in Gemini response');
    }

    const result = JSON.parse(content);
    const questions: Question[] = result.questions || [];

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format from Gemini');
    }

    logger.info('Successfully generated questions with Gemini (FREE)', {
      count: questions.length,
    });

    // Shuffle questions to mix up types (avoid front-loading MCQs)
    const shuffled = questions.sort(() => Math.random() - 0.5);
    
    return shuffled;
  } catch (error) {
    logger.error('Failed to generate questions with Gemini', { error });
    throw error;
  }
}

function createPrompt(params: {
  multipleChoice: number;
  trueFalse: number;
  moreOrLess: number;
  numerical: number;
  categories?: string[];
  difficulties?: ('easy' | 'medium' | 'hard')[];
}): string {
  const { multipleChoice, trueFalse, moreOrLess, numerical, categories, difficulties } = params;

  const categoryStr =
    categories && categories.length > 0
      ? `Focus on these categories: ${categories.join(', ')}. `
      : 'Use diverse categories like Science, History, Geography, Biology, Physics, Chemistry, etc. ';

  const difficultyStr =
    difficulties && difficulties.length > 0
      ? `Difficulty levels: ${difficulties.join(', ')}. `
      : 'Mix difficulty levels (easy, medium, hard). ';

  return `Generate exactly ${multipleChoice + trueFalse + moreOrLess + numerical} trivia questions in JSON format.

${categoryStr}${difficultyStr}

Generate:
- ${multipleChoice} multiple-choice questions (4 options each)
- ${trueFalse} true/false questions
- ${moreOrLess} "more or less" comparison questions (comparing two things)
- ${numerical} numerical questions (with acceptable range)

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "id": "unique_id",
      "type": "multiple-choice",
      "text": "Question text?",
      "category": "Category",
      "difficulty": "easy|medium|hard",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 2,
      "explanation": "Detailed explanation"
    },
    {
      "id": "unique_id",
      "type": "true-false",
      "text": "Statement to evaluate",
      "category": "Category",
      "difficulty": "easy|medium|hard",
      "correctAnswer": true,
      "explanation": "Detailed explanation"
    },
    {
      "id": "unique_id",
      "type": "more-or-less",
      "text": "Which is more: X or Y?",
      "category": "Category",
      "difficulty": "easy|medium|hard",
      "option1": "First thing",
      "option2": "Second thing",
      "correctAnswer": 0,
      "explanation": "Detailed explanation with actual values"
    },
    {
      "id": "unique_id",
      "type": "numerical",
      "text": "Question requiring a number answer?",
      "category": "Category",
      "difficulty": "easy|medium|hard",
      "correctAnswer": 42,
      "unit": "km",
      "acceptableRange": 5,
      "explanation": "Detailed explanation (acceptableRange should be ~10% of correctAnswer, minimum 1)"
    }
  ]
}

Important:
- Make questions interesting and educational
- Ensure all answers are factually correct
- Provide detailed, informative explanations
- Use unique IDs for each question (e.g., "gemini_q1", "gemini_q2")
- For multiple-choice, correctAnswer is the index (0-3)
- For more-or-less, correctAnswer is 0 or 1 (for option1 or option2)
- For numerical, acceptableRange MUST be provided and should be approximately 10% of correctAnswer (minimum 1). Players within this range are considered correct.
- Mix up topics and make questions engaging
- IMPORTANT: Interleave question types throughout the list, don't group all MCQs together`;
}
