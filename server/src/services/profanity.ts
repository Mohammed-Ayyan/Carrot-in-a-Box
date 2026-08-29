/**
 * Server-side Chat Moderation & Sanitization
 */

// Profanity word list
const BANNED_WORDS = [
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'bastard', 'nigger', 'faggot',
  'whore', 'slut', 'cock', 'pussy', 'prick', 'twat', 'wanker', 'motherfucker',
];

// Regex matching whole profanity words (case-insensitive)
const PROFANITY_REGEX = new RegExp(`\\b(${BANNED_WORDS.join('|')})\\b`, 'gi');

/**
 * Filter profanity words by replacing matched banned terms with asterisks.
 */
export function filterProfanity(text: string): string {
  return text.replace(PROFANITY_REGEX, (match) => '*'.repeat(match.length));
}

/**
 * Sanitize untrusted user text inputs:
 *  - Enforce maximum 200 characters
 *  - Escape HTML characters (&, <, >, ", ')
 *  - Filter profanity
 */
export function sanitizeAndModerateChat(rawText: string): string {
  if (!rawText) return '';

  // 1. Truncate to maximum 200 characters
  const trimmed = rawText.trim().slice(0, 200);

  // 2. Escape HTML special characters
  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 3. Apply profanity filter
  return filterProfanity(escaped);
}
