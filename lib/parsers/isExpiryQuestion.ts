// lib/parsers/isExpiryQuestion.ts
export function isExpiryQuestion(text: string): boolean {
  const expiryPatterns = [
    /תוקף.*רישיון/i,
    /רישיון.*תוקף/i,
    /פג.*תוקף/i,
    /תוקף.*פג/i,
    /רישיון.*פג/i,
    /פג.*רישיון/i,
    /license.*expiry/i,
    /license.*expire/i,
    /import.*expire/i,
    /expiring.*license/i,
    /מתי.*פג/i,
    /איזה.*פג/i,
    /לאיזה.*פג/i,
    /לאיזה.*תוקף/i,
  ];

  return expiryPatterns.some((pattern) => pattern.test(text));
}
