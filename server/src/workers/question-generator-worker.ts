import { parentPort, workerData } from 'worker_threads';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Load environment variables
// Priority: .env.local (real secrets) > .env (template/defaults)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envLocalPath = join(__dirname, '../../../.env.local');
const envPath = join(__dirname, '../../../.env');

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config({ path: envPath });
}

/**
 * Worker thread for generating questions.
 * Runs in isolation from main event loop to prevent blocking.
 */
(async () => {
  try {
    const { topic, count, provider } = workerData;
    
    let generateQuestions;
    
    if (provider === 'openai') {
      const module = await import('../lib/openai-question-generator.js');
      generateQuestions = module.generateQuestionsWithOpenAI;
    } else {
      // Default to Gemini
      const module = await import('../lib/gemini-question-generator.js');
      generateQuestions = module.generateQuestionsWithGemini;
    }
    
    const questions = await generateQuestions({
      count,
      categories: topic ? [topic] : undefined
    });
    parentPort?.postMessage(questions);
  } catch (error) {
    // Send error back to main thread
    parentPort?.postMessage({ 
      error: error instanceof Error ? error.message : 'Unknown error in worker' 
    });
  }
})();
