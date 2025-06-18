export function isCountQuestion(text: string): boolean {
  return /(?:כמה|כמות|מספר|how many|number of|count)/i.test(text);
}
