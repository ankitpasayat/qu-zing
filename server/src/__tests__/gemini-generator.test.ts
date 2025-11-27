import { jest } from '@jest/globals';
import { generateQuestionsWithGemini } from '../lib/gemini-question-generator.js';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Gemini Question Generator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GOOGLE_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw error when API key is not set', async () => {
    delete process.env.GOOGLE_API_KEY;

    await expect(generateQuestionsWithGemini({ count: 5 }))
      .rejects.toThrow('Gemini API key not configured');
  });

  it('should throw AbortError when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(generateQuestionsWithGemini({ 
      count: 5, 
      signal: controller.signal 
    })).rejects.toThrow('Question generation cancelled');
  });

  it('should generate questions successfully', async () => {
    const mockQuestions = {
      questions: [
        {
          id: 'gemini_q1',
          type: 'multiple-choice',
          text: 'Test question?',
          category: 'Science',
          difficulty: 'easy',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: 'Test explanation',
        },
        {
          id: 'gemini_q2',
          type: 'true-false',
          text: 'Is this true?',
          category: 'History',
          difficulty: 'medium',
          correctAnswer: true,
          explanation: 'Yes it is',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mockQuestions) }]
          }
        }]
      }),
    } as Response);

    const result = await generateQuestionsWithGemini({ count: 2 });

    expect(result).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should throw error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response);

    await expect(generateQuestionsWithGemini({ count: 5 }))
      .rejects.toThrow('Gemini API error: 500');
  });

  it('should throw error when response has no content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [] }),
    } as Response);

    await expect(generateQuestionsWithGemini({ count: 5 }))
      .rejects.toThrow('No content in Gemini response');
  });

  it('should throw error for invalid questions format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({ questions: [] }) }]
          }
        }]
      }),
    } as Response);

    await expect(generateQuestionsWithGemini({ count: 5 }))
      .rejects.toThrow('Invalid questions format from Gemini');
  });

  it('should use categories when provided', async () => {
    const mockQuestions = {
      questions: [{
        id: 'q1',
        type: 'true-false',
        text: 'Test?',
        category: 'Science',
        difficulty: 'easy',
        correctAnswer: true,
        explanation: 'Test',
      }],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mockQuestions) }]
          }
        }]
      }),
    } as Response);

    await generateQuestionsWithGemini({ 
      count: 1, 
      categories: ['Science', 'History'] 
    });

    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.contents[0].parts[0].text).toContain('Science, History');
  });

  it('should use difficulties when provided', async () => {
    const mockQuestions = {
      questions: [{
        id: 'q1',
        type: 'true-false',
        text: 'Test?',
        category: 'Science',
        difficulty: 'hard',
        correctAnswer: true,
        explanation: 'Test',
      }],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mockQuestions) }]
          }
        }]
      }),
    } as Response);

    await generateQuestionsWithGemini({ 
      count: 1, 
      difficulties: ['hard'] 
    });

    const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.contents[0].parts[0].text).toContain('hard');
  });
});
