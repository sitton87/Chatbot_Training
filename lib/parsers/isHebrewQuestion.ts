// lib/parsers/isHebrewQuestion.ts

export function isHebrewQuestion(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}
