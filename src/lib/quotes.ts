import type { Quote } from '@/types';

export const FALLBACK_QUOTES: Quote[] = [
  { id: '1', text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs', difficulty: 1, charCount: 56 },
  { id: '2', text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein', difficulty: 1, charCount: 46 },
  { id: '3', text: 'Code is like humor. When you have to explain it, it\'s bad.', author: 'Cory House', difficulty: 1, charCount: 56 },
  { id: '4', text: 'First, solve the problem. Then, write the code.', author: 'John Johnson', difficulty: 1, charCount: 48 },
  { id: '5', text: 'Experience is the name everyone gives to their mistakes.', author: 'Oscar Wilde', difficulty: 1, charCount: 55 },
  { id: '6', text: 'The best error message is the one that never shows up.', author: 'Thomas Fuchs', difficulty: 2, charCount: 54 },
  { id: '7', text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman', difficulty: 1, charCount: 36 },
  { id: '8', text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds', difficulty: 1, charCount: 32 },
  { id: '9', text: 'Programs must be written for people to read, and only incidentally for machines to execute.', author: 'Harold Abelson', difficulty: 2, charCount: 94 },
  { id: '10', text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler', difficulty: 2, charCount: 106 },
  { id: '11', text: 'The only true wisdom is in knowing you know nothing.', author: 'Socrates', difficulty: 1, charCount: 50 },
  { id: '12', text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius', difficulty: 1, charCount: 61 },
  { id: '13', text: 'Everything should be made as simple as possible, but not simpler.', author: 'Albert Einstein', difficulty: 2, charCount: 62 },
  { id: '14', text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt', difficulty: 2, charCount: 69 },
  { id: '15', text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill', difficulty: 2, charCount: 82 },
  { id: '16', text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', author: 'Nelson Mandela', difficulty: 2, charCount: 84 },
  { id: '17', text: 'Your time is limited, so don\'t waste it living someone else\'s life.', author: 'Steve Jobs', difficulty: 2, charCount: 63 },
  { id: '18', text: 'If you want to go fast, go alone. If you want to go far, go together.', author: 'African Proverb', difficulty: 2, charCount: 67 },
  { id: '19', text: 'The only limit to our realization of tomorrow is our doubts of today.', author: 'Franklin D. Roosevelt', difficulty: 2, charCount: 70 },
  { id: '20', text: 'Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.', author: 'Buddha', difficulty: 2, charCount: 92 },
  { id: '21', text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela', difficulty: 1, charCount: 42 },
  { id: '22', text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney', difficulty: 1, charCount: 56 },
  { id: '23', text: 'Life is what happens when you\'re busy making other plans.', author: 'John Lennon', difficulty: 1, charCount: 56 },
  { id: '24', text: 'The purpose of our lives is to be happy.', author: 'Dalai Lama', difficulty: 1, charCount: 40 },
  { id: '25', text: 'Get busy living or get busy dying.', author: 'Stephen King', difficulty: 1, charCount: 36 },
  { id: '26', text: 'You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.', author: 'Dr. Seuss', difficulty: 2, charCount: 98 },
  { id: '27', text: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson', difficulty: 2, charCount: 76 },
  { id: '28', text: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt', difficulty: 1, charCount: 42 },
  { id: '29', text: 'Act as if what you do makes a difference. It does.', author: 'William James', difficulty: 1, charCount: 48 },
  { id: '30', text: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins', difficulty: 1, charCount: 52 },
  { id: '31', text: 'In three words I can sum up everything I\'ve learned about life: it goes on.', author: 'Robert Frost', difficulty: 2, charCount: 72 },
  { id: '32', text: 'Life is really simple, but we insist on making it complicated.', author: 'Confucius', difficulty: 1, charCount: 58 },
  { id: '33', text: 'Happiness is not something ready made. It comes from your own actions.', author: 'Dalai Lama', difficulty: 2, charCount: 64 },
  { id: '34', text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb', difficulty: 2, charCount: 73 },
  { id: '35', text: 'An unexamined life is not worth living.', author: 'Socrates', difficulty: 1, charCount: 38 },
  { id: '36', text: 'Turn your wounds into wisdom.', author: 'Oprah Winfrey', difficulty: 1, charCount: 28 },
  { id: '37', text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu', difficulty: 1, charCount: 52 },
  { id: '38', text: 'What you get by achieving your goals is not as important as what you become by achieving your goals.', author: 'Zig Ziglar', difficulty: 2, charCount: 94 },
  { id: '39', text: 'Don\'t watch the clock; do what it does. Keep going.', author: 'Sam Levenson', difficulty: 1, charCount: 50 },
  { id: '40', text: 'The harder you work for something, the greater you\'ll feel when you achieve it.', author: 'Unknown', difficulty: 2, charCount: 72 },
  { id: '41', text: 'Dream big and dare to fail.', author: 'Norman Vaughan', difficulty: 1, charCount: 26 },
  { id: '42', text: 'What we think, we become.', author: 'Buddha', difficulty: 1, charCount: 24 },
  { id: '43', text: 'The mind is everything. What you think you become.', author: 'Buddha', difficulty: 1, charCount: 46 },
  { id: '44', text: 'Whether you think you can or you think you can\'t, you\'re right.', author: 'Henry Ford', difficulty: 2, charCount: 58 },
  { id: '45', text: 'The secret of getting ahead is getting started.', author: 'Mark Twain', difficulty: 1, charCount: 44 },
  { id: '46', text: 'Don\'t let yesterday take up too much of today.', author: 'Will Rogers', difficulty: 1, charCount: 44 },
  { id: '47', text: 'You miss 100% of the shots you don\'t take.', author: 'Wayne Gretzky', difficulty: 1, charCount: 42 },
  { id: '48', text: 'The best revenge is massive success.', author: 'Frank Sinatra', difficulty: 1, charCount: 34 },
  { id: '49', text: 'Strive not to be a success, but rather to be of value.', author: 'Albert Einstein', difficulty: 1, charCount: 50 },
  { id: '50', text: 'Two roads diverged in a wood, and I took the one less traveled by, and that has made all the difference.', author: 'Robert Frost', difficulty: 3, charCount: 96 },
];

let quoteCache: Map<number, Quote[]> = new Map();

export function getQuotesByDifficulty(difficulty: number): Quote[] {
  if (!quoteCache.has(difficulty)) {
    quoteCache.set(difficulty, FALLBACK_QUOTES.filter((q) => q.difficulty === difficulty));
  }
  return quoteCache.get(difficulty)!;
}

export function getRandomQuote(difficulty: number): Quote {
  const quotes = getQuotesByDifficulty(difficulty);
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export async function fetchQuoteFromAPI(difficulty: number): Promise<Quote | null> {
  try {
    const res = await fetch(`/api/quotes?difficulty=${difficulty}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getQuote(difficulty: number): Promise<Quote> {
  const apiQuote = await fetchQuoteFromAPI(difficulty);
  if (apiQuote) return apiQuote;
  return getRandomQuote(difficulty);
}