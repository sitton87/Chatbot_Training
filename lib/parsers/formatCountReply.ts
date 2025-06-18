export function formatCountReply(
  question: string,
  country: string,
  count: number
) {
  const isHebrew = /[\u0590-\u05FF]/.test(question);

  if (isHebrew) {
    return count === 0
      ? `אין ספקים במדינה ${country}.`
      : `יש ${count} ספקים במדינה ${country}.`;
  } else {
    return count === 0
      ? `There are no suppliers in ${country}.`
      : `There are ${count} suppliers in ${country}.`;
  }
}
