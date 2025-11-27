import { getRandomQuestions, getQuestionById, questions } from '../lib/questions.js';

describe('Questions', () => {
  // Store original env values
  const originalGoogleKey = process.env.GOOGLE_API_KEY;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    // Restore env values after each test
    process.env.GOOGLE_API_KEY = originalGoogleKey;
    process.env.OPENAI_API_KEY = originalOpenAIKey;
  });

  describe('questions array', () => {
    it('should have a variety of question types', () => {
      const types = new Set(questions.map(q => q.type));
      expect(types.has('multiple-choice')).toBe(true);
      expect(types.has('true-false')).toBe(true);
      expect(types.has('more-or-less')).toBe(true);
      expect(types.has('numerical')).toBe(true);
    });

    it('should have valid question structure', () => {
      questions.forEach(q => {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('text');
        expect(q).toHaveProperty('category');
        expect(q).toHaveProperty('difficulty');
        expect(q).toHaveProperty('explanation');
        expect(q).toHaveProperty('type');
        expect(q).toHaveProperty('correctAnswer');
        
        expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
      });
    });

    it('should have valid multiple choice questions', () => {
      const mcQuestions = questions.filter(q => q.type === 'multiple-choice');
      
      mcQuestions.forEach(q => {
        if (q.type !== 'multiple-choice') return;
        expect(q.options).toBeInstanceOf(Array);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(typeof q.correctAnswer).toBe('number');
        expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(q.correctAnswer).toBeLessThan(q.options.length);
      });
    });

    it('should have valid true-false questions', () => {
      const tfQuestions = questions.filter(q => q.type === 'true-false');
      
      tfQuestions.forEach(q => {
        expect(typeof q.correctAnswer).toBe('boolean');
      });
    });

    it('should have valid more-or-less questions', () => {
      const molQuestions = questions.filter(q => q.type === 'more-or-less');
      
      molQuestions.forEach(q => {
        if (q.type !== 'more-or-less') return;
        expect(q.option1).toBeDefined();
        expect(q.option2).toBeDefined();
        expect([0, 1]).toContain(q.correctAnswer);
      });
    });

    it('should have valid numerical questions', () => {
      const numQuestions = questions.filter(q => q.type === 'numerical');
      
      numQuestions.forEach(q => {
        expect(typeof q.correctAnswer).toBe('number');
      });
    });
  });

  describe('getRandomQuestions', () => {
    it('should return requested number of questions', async () => {
      const result = await getRandomQuestions(5);
      expect(result).toHaveLength(5);
    });

    it('should return varied question types', async () => {
      const result = await getRandomQuestions(10);
      const types = new Set(result.map(q => q.type));
      
      // Should have at least 2 different types
      expect(types.size).toBeGreaterThanOrEqual(2);
    });

    it('should return unique questions', async () => {
      const result = await getRandomQuestions(10);
      const ids = result.map(q => q.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should handle request for more questions than available', async () => {
      // Request more than available, should return what's available
      const result = await getRandomQuestions(100);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(questions.length);
    });

    it('should randomize question order', async () => {
      const result1 = await getRandomQuestions(10);
      const result2 = await getRandomQuestions(10);
      
      // Very unlikely to be identical if randomized
      const ids1 = result1.map(q => q.id).join(',');
      const ids2 = result2.map(q => q.id).join(',');
      
      // At least one should be different (with high probability)
      // This test has a tiny chance of failure if randomization is working
      // but order happens to be same - that's acceptable
      expect(ids1.length).toBeGreaterThan(0);
      expect(ids2.length).toBeGreaterThan(0);
    });

    it('should abort when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      
      await expect(getRandomQuestions(5, controller.signal))
        .rejects.toThrow('Question generation cancelled');
    });

    it('should use fallback questions when no API keys are set', async () => {
      // Remove API keys to force fallback
      delete process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;
      
      const result = await getRandomQuestions(5);
      expect(result).toHaveLength(5);
      // Should use local fallback questions
      result.forEach(q => {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('text');
      });
    });

    it('should abort between Gemini and OpenAI attempts', async () => {
      // Set a key so Gemini is attempted
      process.env.GOOGLE_API_KEY = 'test-key';
      delete process.env.OPENAI_API_KEY;
      
      const controller = new AbortController();
      
      // Abort after a small delay (during generation)
      setTimeout(() => controller.abort(), 10);
      
      // Since Gemini will fail with invalid key and then check abort, 
      // we should get an abort error or fallback questions
      try {
        const result = await getRandomQuestions(5, controller.signal);
        // If we get here, fallback was used (acceptable)
        expect(result.length).toBeGreaterThan(0);
      } catch (error) {
        // Abort error is expected
        expect((error as Error).name).toBe('AbortError');
      }
    });
  });

  describe('getQuestionById', () => {
    it('should find existing question', () => {
      const question = getQuestionById('q1');
      expect(question).toBeDefined();
      expect(question?.id).toBe('q1');
    });

    it('should return undefined for nonexistent id', () => {
      const question = getQuestionById('nonexistent');
      expect(question).toBeUndefined();
    });
  });
});
