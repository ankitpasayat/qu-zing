import { Question } from '../types/game.js';
import { generateQuestionsWithOpenAI } from './openai-question-generator.js';
import { generateQuestionsWithGemini } from './gemini-question-generator.js';
import { logger } from './logger.js';

// Fallback question database - used when AI generation is not available
// These questions are only used in development or when no API key is set
const fallbackQuestions: Question[] = [
  {
    id: 'q1',
    type: 'multiple-choice',
    text: 'What percentage of the human body is made up of water?',
    category: 'Biology',
    difficulty: 'easy',
    options: ['30-40%', '50-60%', '60-70%', '80-90%'],
    correctAnswer: 2,
    explanation: 'The human body is approximately 60-70% water, varying by age, sex, and body composition.'
  },
  {
    id: 'q2',
    type: 'multiple-choice',
    text: 'How long does it take for light from the Sun to reach Earth?',
    category: 'Physics',
    difficulty: 'medium',
    options: ['8 seconds', '8 minutes', '8 hours', '8 days'],
    correctAnswer: 1,
    explanation: 'Light from the Sun takes approximately 8 minutes and 20 seconds to reach Earth, traveling at 299,792 km/s.'
  },
  {
    id: 'q3',
    type: 'multiple-choice',
    text: 'What is the most abundant gas in Earth\'s atmosphere?',
    category: 'Earth Science',
    difficulty: 'easy',
    options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Argon'],
    correctAnswer: 2,
    explanation: 'Nitrogen makes up about 78% of Earth\'s atmosphere, while oxygen is around 21%.'
  },
  {
    id: 'q4',
    type: 'multiple-choice',
    text: 'At what temperature are Celsius and Fahrenheit equal?',
    category: 'Physics',
    difficulty: 'hard',
    options: ['-40°', '-20°', '0°', '-273°'],
    correctAnswer: 0,
    explanation: 'At -40 degrees, both Celsius and Fahrenheit scales show the same value.'
  },
  {
    id: 'q5',
    type: 'multiple-choice',
    text: 'How many bones does an adult human have?',
    category: 'Biology',
    difficulty: 'medium',
    options: ['186', '206', '226', '246'],
    correctAnswer: 1,
    explanation: 'Adults have 206 bones, while babies are born with about 270 that fuse together as they grow.'
  },
  {
    id: 'q6',
    type: 'multiple-choice',
    text: 'What is the speed of sound at sea level?',
    category: 'Physics',
    difficulty: 'medium',
    options: ['343 m/s', '500 m/s', '1000 m/s', '1500 m/s'],
    correctAnswer: 0,
    explanation: 'Sound travels at approximately 343 meters per second (1,235 km/h) at sea level and 20°C.'
  },
  {
    id: 'q7',
    type: 'multiple-choice',
    text: 'What is the pH of pure water?',
    category: 'Chemistry',
    difficulty: 'easy',
    options: ['5', '7', '9', '11'],
    correctAnswer: 1,
    explanation: 'Pure water has a pH of 7, which is neutral - neither acidic nor basic.'
  },
  {
    id: 'q8',
    type: 'multiple-choice',
    text: 'How many planets in our solar system have rings?',
    category: 'Astronomy',
    difficulty: 'hard',
    options: ['1', '2', '4', '6'],
    correctAnswer: 2,
    explanation: 'Four planets have rings: Jupiter, Saturn, Uranus, and Neptune. Saturn\'s are the most visible.'
  },
  {
    id: 'q9',
    type: 'multiple-choice',
    text: 'What is the smallest unit of life?',
    category: 'Biology',
    difficulty: 'easy',
    options: ['Atom', 'Molecule', 'Cell', 'Organism'],
    correctAnswer: 2,
    explanation: 'The cell is the smallest unit of life that can function independently.'
  },
  {
    id: 'q10',
    type: 'multiple-choice',
    text: 'How many hearts does an octopus have?',
    category: 'Biology',
    difficulty: 'medium',
    options: ['1', '2', '3', '4'],
    correctAnswer: 2,
    explanation: 'Octopuses have three hearts: two pump blood to the gills, and one pumps it to the rest of the body.'
  },
  {
    id: 'q11',
    type: 'multiple-choice',
    text: 'What is the chemical symbol for gold?',
    category: 'Chemistry',
    difficulty: 'easy',
    options: ['Go', 'Gd', 'Au', 'Ag'],
    correctAnswer: 2,
    explanation: 'Au comes from the Latin word "aurum" meaning gold.'
  },
  {
    id: 'q12',
    type: 'multiple-choice',
    text: 'How long is one day on Mars?',
    category: 'Astronomy',
    difficulty: 'hard',
    options: ['20 hours', '24 hours', '24.6 hours', '30 hours'],
    correctAnswer: 2,
    explanation: 'A day on Mars (called a "sol") is 24 hours, 39 minutes, and 35 seconds.'
  },
  {
    id: 'q13',
    type: 'multiple-choice',
    text: 'What is the hardest natural substance on Earth?',
    category: 'Geology',
    difficulty: 'easy',
    options: ['Steel', 'Diamond', 'Titanium', 'Granite'],
    correctAnswer: 1,
    explanation: 'Diamond is the hardest naturally occurring substance, rating 10 on the Mohs scale.'
  },
  {
    id: 'q14',
    type: 'multiple-choice',
    text: 'How many teeth does an adult human typically have?',
    category: 'Biology',
    difficulty: 'easy',
    options: ['28', '30', '32', '34'],
    correctAnswer: 2,
    explanation: 'Adults typically have 32 teeth, including 4 wisdom teeth.'
  },
  {
    id: 'q15',
    type: 'multiple-choice',
    text: 'What percentage of DNA do humans share with chimpanzees?',
    category: 'Biology',
    difficulty: 'medium',
    options: ['85%', '90%', '98%', '99.5%'],
    correctAnswer: 2,
    explanation: 'Humans and chimpanzees share approximately 98-99% of their DNA.'
  },
  {
    id: 'q16',
    type: 'multiple-choice',
    text: 'What is the smallest bone in the human body?',
    category: 'Biology',
    difficulty: 'medium',
    options: ['Stapes (in ear)', 'Finger bone', 'Toe bone', 'Nose bone'],
    correctAnswer: 0,
    explanation: 'The stapes in the middle ear is the smallest bone, measuring about 2.8mm.'
  },
  {
    id: 'q17',
    type: 'multiple-choice',
    text: 'How many Earths could fit inside the Sun?',
    category: 'Astronomy',
    difficulty: 'hard',
    options: ['1,000', '10,000', '100,000', '1,300,000'],
    correctAnswer: 3,
    explanation: 'The Sun is so large that approximately 1.3 million Earths could fit inside it.'
  },
  {
    id: 'q18',
    type: 'multiple-choice',
    text: 'What is the boiling point of water at sea level in Fahrenheit?',
    category: 'Physics',
    difficulty: 'easy',
    options: ['180°F', '212°F', '232°F', '100°F'],
    correctAnswer: 1,
    explanation: 'Water boils at 212°F (100°C) at sea level under normal atmospheric pressure.'
  },
  {
    id: 'q19',
    type: 'multiple-choice',
    text: 'Which element has the atomic number 1?',
    category: 'Chemistry',
    difficulty: 'easy',
    options: ['Helium', 'Oxygen', 'Hydrogen', 'Carbon'],
    correctAnswer: 2,
    explanation: 'Hydrogen is the first element on the periodic table with atomic number 1.'
  },
  {
    id: 'q20',
    type: 'multiple-choice',
    text: 'How long does it take for the Moon to orbit Earth?',
    category: 'Astronomy',
    difficulty: 'medium',
    options: ['7 days', '14 days', '27.3 days', '30 days'],
    correctAnswer: 2,
    explanation: 'The Moon takes 27.3 days to complete one orbit around Earth (sidereal month).'
  },
  {
    id: 'q21',
    type: 'multiple-choice',
    text: 'What percentage of air is oxygen?',
    category: 'Chemistry',
    difficulty: 'medium',
    options: ['10%', '21%', '35%', '50%'],
    correctAnswer: 1,
    explanation: 'Oxygen makes up approximately 21% of Earth\'s atmosphere.'
  },
  {
    id: 'q22',
    type: 'multiple-choice',
    text: 'What is the largest organ in the human body?',
    category: 'Biology',
    difficulty: 'easy',
    options: ['Heart', 'Brain', 'Liver', 'Skin'],
    correctAnswer: 3,
    explanation: 'The skin is the largest organ, covering about 20 square feet in adults.'
  },
  {
    id: 'q23',
    type: 'multiple-choice',
    text: 'At what age does the human brain stop developing?',
    category: 'Biology',
    difficulty: 'hard',
    options: ['18 years', '21 years', '25 years', '30 years'],
    correctAnswer: 2,
    explanation: 'The prefrontal cortex continues developing until around age 25.'
  },
  {
    id: 'q24',
    type: 'multiple-choice',
    text: 'What is the speed of light in a vacuum?',
    category: 'Physics',
    difficulty: 'hard',
    options: ['299,792 km/s', '300,000 km/s', '250,000 km/s', '350,000 km/s'],
    correctAnswer: 0,
    explanation: 'Light travels at exactly 299,792,458 meters per second in a vacuum.'
  },
  {
    id: 'q25',
    type: 'multiple-choice',
    text: 'How many chromosomes do humans have?',
    category: 'Biology',
    difficulty: 'medium',
    options: ['23', '46', '92', '100'],
    correctAnswer: 1,
    explanation: 'Humans have 46 chromosomes (23 pairs) in each cell, except sex cells which have 23.'
  },
  {
    id: 'q26',
    type: 'multiple-choice',
    text: 'What is the closest star to Earth (besides the Sun)?',
    category: 'Astronomy',
    difficulty: 'medium',
    options: ['Alpha Centauri', 'Proxima Centauri', 'Sirius', 'Betelgeuse'],
    correctAnswer: 1,
    explanation: 'Proxima Centauri is 4.24 light-years away, the closest star to our solar system.'
  },
  {
    id: 'q27',
    type: 'multiple-choice',
    text: 'What is absolute zero in Celsius?',
    category: 'Physics',
    difficulty: 'hard',
    options: ['-273.15°C', '-300°C', '-200°C', '-173.15°C'],
    correctAnswer: 0,
    explanation: 'Absolute zero is -273.15°C (-459.67°F or 0 Kelvin), the lowest possible temperature.'
  },
  {
    id: 'q28',
    type: 'multiple-choice',
    text: 'How many elements are on the periodic table?',
    category: 'Chemistry',
    difficulty: 'medium',
    options: ['92', '104', '118', '128'],
    correctAnswer: 2,
    explanation: 'As of 2024, there are 118 confirmed elements on the periodic table.'
  },
  {
    id: 'q29',
    type: 'multiple-choice',
    text: 'What force keeps planets in orbit around the Sun?',
    category: 'Physics',
    difficulty: 'easy',
    options: ['Magnetism', 'Gravity', 'Momentum', 'Friction'],
    correctAnswer: 1,
    explanation: 'Gravity is the force that keeps planets in their orbits around the Sun.'
  },
  {
    id: 'q30',
    type: 'multiple-choice',
    text: 'How many legs does a spider have?',
    category: 'Biology',
    difficulty: 'easy',
    options: ['6', '8', '10', '12'],
    correctAnswer: 1,
    explanation: 'Spiders are arachnids and have 8 legs, unlike insects which have 6.'
  },
  {
    id: 'q31',
    type: 'multiple-choice',
    text: 'What is the largest planet in our solar system?',
    category: 'Astronomy',
    difficulty: 'easy',
    options: ['Saturn', 'Jupiter', 'Neptune', 'Earth'],
    correctAnswer: 1,
    explanation: 'Jupiter is the largest planet, with a mass greater than all other planets combined.'
  },
  {
    id: 'q32',
    type: 'multiple-choice',
    text: 'How many chambers does the human heart have?',
    category: 'Biology',
    difficulty: 'easy',
    options: ['2', '3', '4', '5'],
    correctAnswer: 2,
    explanation: 'The heart has 4 chambers: 2 atria (upper) and 2 ventricles (lower).'
  },
  {
    id: 'q33',
    type: 'multiple-choice',
    text: 'What gas do plants absorb from the atmosphere?',
    category: 'Biology',
    difficulty: 'easy',
    options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Helium'],
    correctAnswer: 2,
    explanation: 'Plants absorb carbon dioxide (CO₂) and release oxygen during photosynthesis.'
  },
  {
    id: 'q34',
    type: 'multiple-choice',
    text: 'What is the chemical formula for table salt?',
    category: 'Chemistry',
    difficulty: 'medium',
    options: ['NaCl', 'KCl', 'CaCl₂', 'NaOH'],
    correctAnswer: 0,
    explanation: 'Table salt is sodium chloride with the chemical formula NaCl.'
  },
  {
    id: 'q35',
    type: 'multiple-choice',
    text: 'How many years does it take for Pluto to orbit the Sun?',
    category: 'Astronomy',
    difficulty: 'hard',
    options: ['84 years', '165 years', '248 years', '365 years'],
    correctAnswer: 2,
    explanation: 'Pluto takes about 248 Earth years to complete one orbit around the Sun.'
  },

  // TRUE/FALSE QUESTIONS
  {
    id: 'q36',
    type: 'true-false',
    text: '"E" is the most commonly used letter in the English language.',
    category: 'Language',
    difficulty: 'easy',
    correctAnswer: true,
    explanation: 'E is the most common letter in English text, appearing about 13% of the time. This is followed by T, A, O, I, and N.'
  },
  {
    id: 'q37',
    type: 'true-false',
    text: 'Bananas grow on trees.',
    category: 'Biology',
    difficulty: 'medium',
    correctAnswer: false,
    explanation: 'Bananas grow on large herbaceous plants, not trees. The banana "tree" is actually the world\'s largest herb.'
  },
  {
    id: 'q38',
    type: 'true-false',
    text: 'The Great Wall of China is visible from space with the naked eye.',
    category: 'Geography',
    difficulty: 'easy',
    correctAnswer: false,
    explanation: 'This is a common myth. The Great Wall is not visible from space with the naked eye. Astronauts report it\'s barely visible even from low Earth orbit.'
  },
  {
    id: 'q39',
    type: 'true-false',
    text: 'Lightning can strike the same place twice.',
    category: 'Physics',
    difficulty: 'easy',
    correctAnswer: true,
    explanation: 'Lightning frequently strikes the same place multiple times. Tall structures like the Empire State Building are struck about 25 times per year.'
  },
  {
    id: 'q40',
    type: 'true-false',
    text: 'Goldfish have a memory span of only 3 seconds.',
    category: 'Biology',
    difficulty: 'medium',
    correctAnswer: false,
    explanation: 'Goldfish actually have memories lasting at least several months and can be trained to recognize shapes, colors, and sounds.'
  },
  {
    id: 'q41',
    type: 'true-false',
    text: 'Humans and dinosaurs coexisted at some point in history.',
    category: 'History',
    difficulty: 'easy',
    correctAnswer: false,
    explanation: 'Dinosaurs went extinct about 65 million years ago, while modern humans appeared only about 300,000 years ago.'
  },
  {
    id: 'q42',
    type: 'true-false',
    text: 'Mount Everest is the tallest mountain on Earth measured from base to peak.',
    category: 'Geography',
    difficulty: 'hard',
    correctAnswer: false,
    explanation: 'Mauna Kea in Hawaii is taller when measured from its base on the ocean floor (about 10,200m) compared to Everest (about 8,849m from sea level).'
  },
  {
    id: 'q43',
    type: 'true-false',
    text: 'Bats are blind.',
    category: 'Biology',
    difficulty: 'medium',
    correctAnswer: false,
    explanation: 'Bats can see quite well. While they use echolocation to navigate, all bat species have eyes and can see, some even better than humans in low light.'
  },
  {
    id: 'q44',
    type: 'true-false',
    text: 'Caffeine is found naturally in coffee, tea, and chocolate.',
    category: 'Chemistry',
    difficulty: 'easy',
    correctAnswer: true,
    explanation: 'Caffeine is a naturally occurring stimulant found in over 60 plant species, including coffee beans, tea leaves, and cacao pods.'
  },
  {
    id: 'q45',
    type: 'true-false',
    text: 'The human body has more bacterial cells than human cells.',
    category: 'Biology',
    difficulty: 'hard',
    correctAnswer: false,
    explanation: 'Recent studies show humans have roughly equal numbers of bacterial and human cells (about 38 trillion each), not 10:1 as previously thought.'
  },

  // MORE-OR-LESS QUESTIONS
  {
    id: 'q46',
    type: 'more-or-less',
    text: 'Which is wider: Australia (east-to-west) or the Moon (diameter)?',
    category: 'Geography',
    difficulty: 'hard',
    option1: 'Australia',
    option2: 'The Moon',
    correctAnswer: 0,
    explanation: 'Australia\'s east-to-west width is about 4,000 km, while the Moon\'s diameter is roughly 3,474 km. So Australia is wider!'
  },
  {
    id: 'q47',
    type: 'more-or-less',
    text: 'Which animal has more bones: Humans or Cats?',
    category: 'Biology',
    difficulty: 'medium',
    option1: 'Humans (adult)',
    option2: 'Cats',
    correctAnswer: 1,
    explanation: 'Cats have about 230 bones while adult humans have 206. Cats need the extra bones for their flexible spine and tail.'
  },
  {
    id: 'q48',
    type: 'more-or-less',
    text: 'Which country has a larger land area: Canada or China?',
    category: 'Geography',
    difficulty: 'medium',
    option1: 'Canada',
    option2: 'China',
    correctAnswer: 0,
    explanation: 'Canada has a total area of 9.98 million km², while China has 9.60 million km². Canada is the second-largest country by total area.'
  },
  {
    id: 'q49',
    type: 'more-or-less',
    text: 'Which has more species: All mammals combined or beetles alone?',
    category: 'Biology',
    difficulty: 'hard',
    option1: 'All mammal species',
    option2: 'Beetle species alone',
    correctAnswer: 1,
    explanation: 'There are about 6,500 mammal species but over 400,000 known beetle species! Beetles make up about 40% of all known insects.'
  },
  {
    id: 'q50',
    type: 'more-or-less',
    text: 'Which weighs more: All humans on Earth or all ants on Earth?',
    category: 'Biology',
    difficulty: 'hard',
    option1: 'All humans combined',
    option2: 'All ants combined',
    correctAnswer: 1,
    explanation: 'The total mass of all ants on Earth (about 20 quadrillion ants) is estimated to exceed the total mass of all humans!'
  },
  {
    id: 'q51',
    type: 'more-or-less',
    text: 'Which came first: The Oxford University founding or the Aztec Empire?',
    category: 'History',
    difficulty: 'hard',
    option1: 'Oxford University',
    option2: 'Aztec Empire',
    correctAnswer: 0,
    explanation: 'Oxford University began teaching around 1096, while the Aztec Empire was founded in 1428. Oxford is older by over 300 years!'
  },
  {
    id: 'q52',
    type: 'more-or-less',
    text: 'Which planet has a longer day: Earth or Venus?',
    category: 'Astronomy',
    difficulty: 'medium',
    option1: 'Earth',
    option2: 'Venus',
    correctAnswer: 1,
    explanation: 'Venus has the longest day of any planet. One day on Venus (243 Earth days) is longer than its year (225 Earth days)!'
  },
  {
    id: 'q53',
    type: 'more-or-less',
    text: 'Which has more water: All Earth\'s clouds combined or Lake Superior?',
    category: 'Earth Science',
    difficulty: 'hard',
    option1: 'All Earth\'s clouds',
    option2: 'Lake Superior',
    correctAnswer: 1,
    explanation: 'Lake Superior contains about 12,000 km³ of water, while all of Earth\'s clouds combined contain only about 13 km³!'
  },
  {
    id: 'q54',
    type: 'more-or-less',
    text: 'Which is denser: A neutron star or Mount Everest?',
    category: 'Physics',
    difficulty: 'easy',
    option1: 'Neutron star (per teaspoon)',
    option2: 'Mount Everest (per teaspoon)',
    correctAnswer: 0,
    explanation: 'A teaspoon of neutron star material would weigh about 6 billion tons, while a teaspoon of Everest rock weighs just a few grams.'
  },
  {
    id: 'q55',
    type: 'more-or-less',
    text: 'Which has stronger bite force: A great white shark or a hippo?',
    category: 'Biology',
    difficulty: 'medium',
    option1: 'Great white shark',
    option2: 'Hippopotamus',
    correctAnswer: 1,
    explanation: 'A hippo\'s bite force is about 1,800 PSI while a great white shark\'s is around 650 PSI. Hippos have the strongest bite of any land mammal!'
  },

  // NUMERICAL QUESTIONS
  {
    id: 'q56',
    type: 'numerical',
    text: 'How many time zones does Russia span?',
    category: 'Geography',
    difficulty: 'hard',
    correctAnswer: 11,
    unit: 'zones',
    acceptableRange: 1,
    explanation: 'Russia spans 11 time zones, from UTC+2 (Kaliningrad) to UTC+12 (Kamchatka), the most of any country.'
  },
  {
    id: 'q57',
    type: 'numerical',
    text: 'What percentage of the Earth\'s surface is covered by water?',
    category: 'Earth Science',
    difficulty: 'medium',
    correctAnswer: 71,
    unit: '%',
    acceptableRange: 3,
    explanation: 'About 71% of Earth\'s surface is covered by water, with oceans containing 96.5% of all Earth\'s water.'
  },
  {
    id: 'q58',
    type: 'numerical',
    text: 'How many days does it take Mercury to orbit the Sun?',
    category: 'Astronomy',
    difficulty: 'hard',
    correctAnswer: 88,
    unit: 'days',
    acceptableRange: 5,
    explanation: 'Mercury completes one orbit around the Sun in approximately 88 Earth days, the shortest orbital period of any planet.'
  },
  {
    id: 'q59',
    type: 'numerical',
    text: 'At what temperature in Celsius does water freeze at sea level?',
    category: 'Physics',
    difficulty: 'easy',
    correctAnswer: 0,
    unit: '°C',
    acceptableRange: 0,
    explanation: 'Water freezes at 0°C (32°F) at sea level under standard atmospheric pressure.'
  },
  {
    id: 'q60',
    type: 'numerical',
    text: 'How many continents are there on Earth?',
    category: 'Geography',
    difficulty: 'easy',
    correctAnswer: 7,
    unit: 'continents',
    acceptableRange: 0,
    explanation: 'There are 7 continents: Africa, Antarctica, Asia, Europe, North America, Oceania, and South America.'
  },
  {
    id: 'q61',
    type: 'numerical',
    text: 'How many players are on a soccer/football team on the field?',
    category: 'Sports',
    difficulty: 'easy',
    correctAnswer: 11,
    unit: 'players',
    acceptableRange: 0,
    explanation: 'Each soccer team has 11 players on the field during a match, including the goalkeeper.'
  },
  {
    id: 'q62',
    type: 'numerical',
    text: 'What is the normal human body temperature in Fahrenheit?',
    category: 'Biology',
    difficulty: 'easy',
    correctAnswer: 98.6,
    unit: '°F',
    acceptableRange: 1,
    explanation: 'Normal human body temperature is approximately 98.6°F (37°C), though it can vary slightly by individual and time of day.'
  },
  {
    id: 'q63',
    type: 'numerical',
    text: 'How many strings does a standard guitar have?',
    category: 'Music',
    difficulty: 'easy',
    correctAnswer: 6,
    unit: 'strings',
    acceptableRange: 0,
    explanation: 'A standard guitar has 6 strings, traditionally tuned to E, A, D, G, B, and E from lowest to highest pitch.'
  },
  {
    id: 'q64',
    type: 'numerical',
    text: 'How many sides does a hexagon have?',
    category: 'Mathematics',
    difficulty: 'easy',
    correctAnswer: 6,
    unit: 'sides',
    acceptableRange: 0,
    explanation: 'A hexagon is a polygon with 6 sides and 6 angles. A regular hexagon has all sides and angles equal.'
  },
  {
    id: 'q65',
    type: 'numerical',
    text: 'In what year did World War II end?',
    category: 'History',
    difficulty: 'medium',
    correctAnswer: 1945,
    unit: '',
    acceptableRange: 0,
    explanation: 'World War II ended in 1945, with Germany surrendering in May and Japan surrendering in September after the atomic bombings.'
  },
];

/**
 * Get random questions - tries AI generation first, falls back to local questions
 * Priority: Google Gemini (FREE) > OpenAI (paid) > Fallback questions
 */
export async function getRandomQuestions(count: number, signal?: AbortSignal): Promise<Question[]> {
  // Check if cancelled before starting
  if (signal?.aborted) {
    throw new DOMException('Question generation cancelled', 'AbortError');
  }
  
  // Try Google Gemini first (FREE with generous limits!)
  if (process.env.GOOGLE_API_KEY) {
    try {
      logger.info('Attempting to generate questions with Gemini (FREE)');
      const questions = await generateQuestionsWithGemini({ count, signal });
      return questions;
    } catch (error) {
      // Re-throw abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      logger.warn('Gemini generation failed, trying OpenAI', { error });
      // Fall through to try OpenAI
    }
  }

  // Check if cancelled before trying OpenAI
  if (signal?.aborted) {
    throw new DOMException('Question generation cancelled', 'AbortError');
  }

  // Try OpenAI if available (paid but cheap)
  if (process.env.OPENAI_API_KEY) {
    try {
      logger.info('Attempting to generate questions with OpenAI');
      const questions = await generateQuestionsWithOpenAI({ count, signal });
      return questions;
    } catch (error) {
      // Re-throw abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      logger.warn('OpenAI generation failed, falling back to local questions', { error });
      // Fall through to use fallback questions
    }
  }

  // If no API keys configured
  if (!process.env.GOOGLE_API_KEY && !process.env.OPENAI_API_KEY) {
    logger.info('No API keys set, using fallback questions');
  }

  // Fallback to local questions (instant, no need for abort check)
  return getRandomQuestionsFromFallback(count);
}

/**
 * Get random questions from the fallback database
 */
function getRandomQuestionsFromFallback(count: number): Question[] {
  // Separate questions by type
  const multipleChoice = fallbackQuestions.filter(q => q.type === 'multiple-choice');
  const trueFalse = fallbackQuestions.filter(q => q.type === 'true-false');
  const moreOrLess = fallbackQuestions.filter(q => q.type === 'more-or-less');
  const numerical = fallbackQuestions.filter(q => q.type === 'numerical');
  
  // Calculate distribution optimized for fun and engagement
  // Target: 40% multiple-choice, 25% true-false, 30% more-or-less, 5% numerical
  const targetMC = Math.floor(count * 0.4);   // 40% - core gameplay
  const targetTF = Math.floor(count * 0.25);  // 25% - quick & engaging
  const targetMOL = Math.floor(count * 0.3);  // 30% - most fun, creates debates
  const targetNum = count - targetMC - targetTF - targetMOL; // ~5% - keep minimal
  
  // Shuffle each category
  const shuffleMC = [...multipleChoice].sort(() => Math.random() - 0.5);
  const shuffleTF = [...trueFalse].sort(() => Math.random() - 0.5);
  const shuffleMOL = [...moreOrLess].sort(() => Math.random() - 0.5);
  const shuffleNum = [...numerical].sort(() => Math.random() - 0.5);
  
  // Select questions from each category
  const selected = [
    ...shuffleMC.slice(0, Math.min(targetMC, shuffleMC.length)),
    ...shuffleTF.slice(0, Math.min(targetTF, shuffleTF.length)),
    ...shuffleMOL.slice(0, Math.min(targetMOL, shuffleMOL.length)),
    ...shuffleNum.slice(0, Math.min(targetNum, shuffleNum.length)),
  ];
  
  // If we don't have enough questions of certain types, fill with any remaining
  if (selected.length < count) {
    const remaining = fallbackQuestions
      .filter(q => !selected.includes(q))
      .sort(() => Math.random() - 0.5)
      .slice(0, count - selected.length);
    selected.push(...remaining);
  }
  
  // Final shuffle to mix up the order
  return selected.sort(() => Math.random() - 0.5).slice(0, count);
}

export function getQuestionById(id: string): Question | undefined {
  return fallbackQuestions.find(q => q.id === id);
}

// Export questions for tests and other uses
export const questions = fallbackQuestions;
