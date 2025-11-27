import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import { logger } from '../lib/logger.js';
import type { Question } from '../types/game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate questions using a worker thread to avoid blocking the main event loop.
 * This is especially important for AI-generated questions which can take several seconds.
 * 
 * Benefits:
 * - Main thread stays responsive for Socket.IO connections
 * - Multiple questions can be generated in parallel
 * - CPU-intensive AI processing doesn't block other requests
 * 
 * @param topic - The topic for question generation
 * @param count - Number of questions to generate
 * @param provider - AI provider ('gemini' or 'openai')
 * @returns Promise with generated questions
 */
export async function generateQuestionsInWorker(
  topic: string, 
  count: number,
  provider: 'gemini' | 'openai' = 'gemini'
): Promise<Question[]> {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'question-generator-worker.js');
    
    logger.info(`🔧 Starting worker thread for question generation: ${topic} (${count} questions, provider: ${provider})`);
    
    const worker = new Worker(workerPath, {
      workerData: { topic, count, provider }
    });

    // Set timeout to prevent hanging workers (30 seconds)
    const timeout = setTimeout(() => {
      worker.terminate();
      logger.error(`⏱️  Worker timeout: Question generation exceeded 30 seconds`);
      reject(new Error('Question generation timed out after 30 seconds'));
    }, 30000);

    worker.on('message', (result) => {
      clearTimeout(timeout);
      
      if (result.error) {
        logger.error(`❌ Worker error: ${result.error}`);
        reject(new Error(result.error));
      } else {
        logger.info(`✅ Worker completed: Generated ${result?.length || 0} questions`);
        resolve(result);
      }
    });

    worker.on('error', (error) => {
      clearTimeout(timeout);
      logger.error('❌ Worker thread error:', error);
      reject(error);
    });

    worker.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        logger.error(`⚠️  Worker stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}
