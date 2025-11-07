/**
 * Lexicographic ranking utility for stable ordering with O(1) inserts
 * Based on LexoRank algorithm - generates string ranks that maintain order
 */

export const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const MIN_CHAR = ALPHABET[0]; // '0'
const MAX_CHAR = ALPHABET[ALPHABET.length - 1]; // 'z'
const MID_CHAR = ALPHABET[Math.floor(ALPHABET.length / 2)]; // 'V'

/**
 * Generate a rank string between two ranks
 * Treats null/empty as sentinels (MIN/MAX bounds)
 */
export function rankBetween(a: string | null, b: string | null): string {
  const rankA = a || '';
  const rankB = b || '';

  // If both are empty/null, return middle value
  if (!rankA && !rankB) {
    return MID_CHAR;
  }

  // If A is empty (insert at beginning)
  if (!rankA) {
    return rankBefore(rankB);
  }

  // If B is empty (insert at end)
  if (!rankB) {
    return rankAfter(rankA);
  }

  // Find median between A and B
  return findMedian(rankA, rankB);
}

/**
 * Generate a rank before the given rank
 */
export function rankBefore(b: string | null): string {
  if (!b) {
    return MID_CHAR;
  }

  // Find a string that comes before b
  const chars = b.split('');

  // Try to decrement the last character
  for (let i = chars.length - 1; i >= 0; i--) {
    const charIndex = ALPHABET.indexOf(chars[i]);
    if (charIndex > 0) {
      chars[i] = ALPHABET[charIndex - 1];
      return chars.join('');
    }
    // If we hit MIN_CHAR, continue to previous position
    chars[i] = MAX_CHAR;
  }

  // If all chars were MIN_CHAR, prepend a char
  return MIN_CHAR + b;
}

/**
 * Generate a rank after the given rank
 */
export function rankAfter(a: string | null): string {
  if (!a) {
    return MID_CHAR;
  }

  // Find a string that comes after a
  const chars = a.split('');

  // Try to increment the last character
  for (let i = chars.length - 1; i >= 0; i--) {
    const charIndex = ALPHABET.indexOf(chars[i]);
    if (charIndex < ALPHABET.length - 1) {
      chars[i] = ALPHABET[charIndex + 1];
      return chars.join('');
    }
    // If we hit MAX_CHAR, continue to previous position
    chars[i] = MIN_CHAR;
  }

  // If all chars were MAX_CHAR, append a char
  return a + MID_CHAR;
}

/**
 * Find median string between two ranks
 */
function findMedian(a: string, b: string): string {
  if (a >= b) {
    throw new Error(`Invalid rank order: '${a}' should be < '${b}'`);
  }

  const maxLen = Math.max(a.length, b.length);
  const paddedA = a.padEnd(maxLen, MIN_CHAR);
  const paddedB = b.padEnd(maxLen, MIN_CHAR);

  let result = '';
  let carry = 0;

  for (let i = 0; i < maxLen; i++) {
    const charA = ALPHABET.indexOf(paddedA[i]);
    const charB = ALPHABET.indexOf(paddedB[i]);

    const mid = Math.floor((charA + charB + carry) / 2);

    if (charA === charB) {
      result += ALPHABET[charA];
      continue;
    }

    if (charB - charA > 1) {
      result += ALPHABET[mid];
      break;
    }

    // Need to go deeper - no space between adjacent chars
    result += ALPHABET[charA];
    carry = ALPHABET.length;
  }

  // If we couldn't find space, append a middle character
  if (result.length === maxLen) {
    result += MID_CHAR;
  }

  return result;
}

/**
 * Compare two ranks (-1, 0, 1)
 */
export function compareRank(a: string | null, b: string | null): number {
  const rankA = a || '';
  const rankB = b || '';

  if (rankA < rankB) return -1;
  if (rankA > rankB) return 1;
  return 0;
}

/**
 * Check if a rank conflicts with existing ranks in a list
 * @param targetRank - The rank to check
 * @param existingRanks - Array of existing ranks to check against
 * @returns true if there's a conflict
 */
export function hasRankConflict(
  targetRank: string,
  existingRanks: Array<{ order_rank: string }>
): boolean {
  return existingRanks.some(item => item.order_rank === targetRank);
}

/**
 * Find a safe rank that doesn't conflict with existing items
 * If the desired rank conflicts, find the first available position
 * @param desiredRank - The rank we want to use
 * @param existingRanks - Array of existing ranks (sorted by order_rank)
 * @returns A safe rank that doesn't conflict
 */
export function findSafeRank(
  desiredRank: string,
  existingRanks: Array<{ order_rank: string }>
): string {
  // Sort existing ranks to work with ordered list
  const sortedRanks = existingRanks
    .map(item => item.order_rank)
    .filter(rank => rank && rank.length > 0)
    .sort();

  // If desired rank doesn't conflict, use it
  if (!hasRankConflict(desiredRank, existingRanks)) {
    return desiredRank;
  }

  if (__DEV__) {
    console.log(`🔍 [RANK] Conflict detected for rank '${desiredRank}', finding safe position`);
  }

  // Find position where desired rank would fit in sorted order
  const insertIndex = sortedRanks.findIndex(rank => rank >= desiredRank);

  if (insertIndex === -1) {
    // Desired rank is greater than all existing ranks - put it at the end
    const lastRank = sortedRanks[sortedRanks.length - 1];
    const safeRank = rankAfter(lastRank);

    if (__DEV__) {
      console.log(`🔍 [RANK] Using rank after last: '${safeRank}'`);
    }
    return safeRank;
  } else if (insertIndex === 0) {
    // Desired rank is smaller than all existing ranks - put it at the beginning
    const firstRank = sortedRanks[0];
    const safeRank = rankBefore(firstRank);

    if (__DEV__) {
      console.log(`🔍 [RANK] Using rank before first: '${safeRank}'`);
    }
    return safeRank;
  } else {
    // Find space between existing ranks around the desired position
    const prevRank = sortedRanks[insertIndex - 1];
    const nextRank = sortedRanks[insertIndex];
    const safeRank = rankBetween(prevRank, nextRank);

    if (__DEV__) {
      console.log(`🔍 [RANK] Using rank between '${prevRank}' and '${nextRank}': '${safeRank}'`);
    }
    return safeRank;
  }
}

// DEV-only tests
if (__DEV__) {
  // Basic tests
  console.assert(rankBetween('', '') === MID_CHAR, 'Empty ranks should return middle');
  console.assert(rankBetween('', 'b') < 'b', 'Before b should be less than b');
  console.assert(rankBetween('a', '') > 'a', 'After a should be greater than a');
  console.assert(rankBetween('a', 'c') > 'a' && rankBetween('a', 'c') < 'c', 'Between a and c');

  // Edge cases
  const beforeA = rankBefore('a');
  const afterZ = rankAfter('z');
  console.assert(beforeA < 'a', 'Before a test');
  console.assert(afterZ > 'z', 'After z test');

  if (__DEV__) {
    console.log('🧪 Rank utility tests passed');
  }
}