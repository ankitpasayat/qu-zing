import { Question } from '../types/game.js';
import { logger } from './logger.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface QuestionGenerationParams {
  count: number;
  categories?: string[];
  difficulties?: ('easy' | 'medium' | 'hard')[];
  signal?: AbortSignal;
}

/**
 * Generate trivia questions using OpenAI API (GPT-4o-mini)
 * Paid option - costs about $0.01 per game
 */
export async function generateQuestionsWithOpenAI(
  params: QuestionGenerationParams
): Promise<Question[]> {
  // Read API key at runtime, not at module load time
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY not set, falling back to local questions');
    throw new Error('AI question generation not configured');
  }

  const { count, categories, difficulties, signal } = params;

  // Check if already aborted
  if (signal?.aborted) {
    throw new DOMException('Question generation cancelled', 'AbortError');
  }

  // Calculate distribution optimized for fun and engagement
  // Target: 40% multiple-choice, 25% true-false, 30% more-or-less, 5% numerical
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
    logger.info('Generating questions with AI', { count, categories, difficulties });

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a trivia question generator. Generate high-quality, interesting trivia questions with accurate answers and explanations. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('OpenAI API error', { status: response.status, error });
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const result = JSON.parse(content);
    const questions: Question[] = result.questions || [];

    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format from AI');
    }

    logger.info('Successfully generated questions with AI', {
      count: questions.length,
    });

    return questions;
  } catch (error) {
    logger.error('Failed to generate questions with AI', { error });
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

  const categoryStr = categories && categories.length > 0 
    ? `Focus on these categories: ${categories.join(', ')}. `
    : 'Use diverse categories like Science, History, Geography, Biology, Physics, Chemistry, etc. ';

  const difficultyStr = difficulties && difficulties.length > 0
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
      "explanation": "Detailed explanation"
    }
  ]
}

Important:
- Make questions interesting and educational
- Ensure all answers are factually correct
- Provide detailed, informative explanations
- Use unique IDs for each question (e.g., "ai_q1", "ai_q2")
- For multiple-choice, correctAnswer is the index (0-3)
- For more-or-less, correctAnswer is 0 or 1 (for option1 or option2)
- For numerical, include acceptableRange (how close answer needs to be)
- Mix up topics and make questions engaging`;
}
