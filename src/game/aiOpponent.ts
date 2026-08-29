import { PlayerChoice } from './types';

/**
 * AI Opponent Bluff & Decision Engine for Carrot in a Box.
 */

interface BluffTemplate {
  text: string;
}

const HAS_CARROT_BLUFFS: BluffTemplate[] = [
  { text: "I'm looking inside... and I'm very happy with what I see. You should definitely SWAP with me!" },
  { text: "Oh dear... my box is completely empty. Total blank. You should definitely KEEP your box." },
  { text: "I am not going to say a single word. Just look at this confident smile on my face." },
  { text: "There is 100% NO carrot in here. Truly! Don't swap, you'll regret it!" },
  { text: "Well, well, well... look what we have here. A crisp, juicy carrot resting in Box A." }
];

const NO_CARROT_BLUFFS: BluffTemplate[] = [
  { text: "Aha! The carrot is 100% inside my box. Don't even THINK about swapping with me!" },
  { text: "Empty as a drum. If I were sitting in your seat, I would swap right now!" },
  { text: "I can neither confirm nor deny that a majestic orange vegetable is resting right here." },
  { text: "I peeked inside, and let's just say... you're in trouble if you keep your box!" },
  { text: "My box contains pure gold... or maybe just air. Do you dare to swap?" }
];

export function generateBluff(opponentHasCarrot: boolean): string {
  const templates = opponentHasCarrot ? HAS_CARROT_BLUFFS : NO_CARROT_BLUFFS;
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex].text;
}

/**
 * AI Opponent Decision Engine:
 * Evaluates the Player's chosen bluff statement and decides whether to SWAP or KEEP.
 */
export function decideAiChoice(playerBluffIndex: number, playerHasCarrot: boolean): PlayerChoice {
  const rand = Math.random();

  // Player Bluff Index 0: Confident Claim ("I definitely have the carrot! Swap with me!")
  if (playerBluffIndex === 0) {
    // AI suspects reverse psychology 60% of the time
    return rand < 0.6 ? 'KEEP' : 'SWAP';
  }

  // Player Bluff Index 1: Empty Claim ("My box is empty... keep your box if you dare!")
  if (playerBluffIndex === 1) {
    // AI thinks player is hiding carrot 65% of the time -> SWAP
    return rand < 0.65 ? 'SWAP' : 'KEEP';
  }

  // Player Bluff Index 2: Poker Face ("I'm saying nothing. Look at my poker face.")
  // 50/50 toss up
  return rand < 0.5 ? 'SWAP' : 'KEEP';
}
