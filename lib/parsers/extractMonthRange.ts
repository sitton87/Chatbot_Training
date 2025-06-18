// lib/parsers/extractMonthRange.ts
export function extractMonthRange(question: string): {
  start: Date;
  end: Date;
  year: number;
  month: number;
} {
  const monthMap: Record<string, number> = {
    ינואר: 0,
    january: 0,
    jan: 0,
    פברואר: 1,
    february: 1,
    feb: 1,
    מרץ: 2,
    march: 2,
    mar: 2,
    אפריל: 3,
    april: 3,
    apr: 3,
    מאי: 4,
    may: 4,
    יוני: 5,
    june: 5,
    jun: 5,
    יולי: 6,
    july: 6,
    jul: 6,
    אוגוסט: 7,
    august: 7,
    aug: 7,
    ספטמבר: 8,
    september: 8,
    sep: 8,
    אוקטובר: 9,
    october: 9,
    oct: 9,
    נובמבר: 10,
    november: 10,
    nov: 10,
    דצמבר: 11,
    december: 11,
    dec: 11,
  };

  const lowerQuestion = question.toLowerCase();
  console.log("📅 Analyzing date question:", question);

  // זיהוי טווח "מהיום עד..."
  const todayRangeMatch = lowerQuestion.match(
    /מהיום.*?עד.*?(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר|january|february|march|april|may|june|july|august|september|october|november|december).*?(\d{2,4})?/
  );

  if (todayRangeMatch) {
    const monthName = todayRangeMatch[1];
    const yearStr = todayRangeMatch[2];

    const monthNum = monthMap[monthName];
    const year = yearStr
      ? yearStr.length === 2
        ? 2000 + parseInt(yearStr)
        : parseInt(yearStr)
      : new Date().getFullYear() + 1;

    const start = new Date(); // מהיום
    const end = new Date(year, monthNum + 1, 0, 23, 59, 59); // סוף החודש

    console.log(
      `📅 Today range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    );

    return {
      start,
      end,
      year,
      month: monthNum,
    };
  }

  // זיהוי חודש + שנה (דצמבר 25, ינואר 26)
  const monthYearMatch = lowerQuestion.match(
    /(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר|january|february|march|april|may|june|july|august|september|october|november|december).*?(\d{2,4})/
  );

  if (monthYearMatch) {
    const monthName = monthYearMatch[1];
    const yearStr = monthYearMatch[2];

    const monthNum = monthMap[monthName];
    const year =
      yearStr.length === 2 ? 2000 + parseInt(yearStr) : parseInt(yearStr);

    const start = new Date(year, monthNum, 1);
    const end = new Date(year, monthNum + 1, 0, 23, 59, 59);

    console.log(
      `📅 Month/Year range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    );

    return {
      start,
      end,
      year,
      month: monthNum,
    };
  }

  // זיהוי חודש בלבד (ללא שנה מפורשת)
  let monthNum: number | undefined;
  for (const [name, index] of Object.entries(monthMap)) {
    if (lowerQuestion.includes(name)) {
      monthNum = index;
      break;
    }
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  if (monthNum !== undefined) {
    // קבע שנה - אם החודש כבר עבר השנה, זה לשנה הבאה
    const targetYear =
      monthNum < now.getMonth() ? currentYear + 1 : currentYear;

    const start = new Date(targetYear, monthNum, 1);
    const end = new Date(targetYear, monthNum + 1, 0, 23, 59, 59);

    console.log(
      `📅 Month only range: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    );

    return {
      start,
      end,
      year: targetYear,
      month: monthNum,
    };
  }

  // ברירת מחדל - החודש הנוכחי
  const defaultYear = currentYear;
  const defaultMonth = now.getMonth();

  const start = new Date(defaultYear, defaultMonth, 1);
  const end = new Date(defaultYear, defaultMonth + 1, 0, 23, 59, 59);

  console.log(
    `📅 Default range (current month): ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
  );

  return {
    start,
    end,
    year: defaultYear,
    month: defaultMonth,
  };
}
