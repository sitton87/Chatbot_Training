// lib/parsers/extractCountry.ts

// מילון תרגום מדינות עברית->אנגלית
const countryMap: Record<string, string> = {
  // עברית
  סין: "China",
  גרמניה: "Germany",
  גרמאניה: "Germany",
  'ארה"ב': "USA",
  ארהב: "USA",
  אמריקה: "USA",
  איטליה: "Italy",
  ספרד: "Spain",
  רוסיה: "Russia",
  יפן: "Japan",
  קוריאה: "Korea",
  הודו: "India",
  ברזיל: "Brazil",
  צרפת: "France",
  בריטניה: "UK",
  הולנד: "Netherlands",
  בלגיה: "Belgium",
  שוויץ: "Switzerland",
  אוסטריה: "Austria",

  // אנגלית
  china: "China",
  germany: "Germany",
  usa: "USA",
  america: "USA",
  italy: "Italy",
  spain: "Spain",
  russia: "Russia",
  japan: "Japan",
  korea: "Korea",
  india: "India",
  brazil: "Brazil",
  france: "France",
  uk: "UK",
  britain: "UK",
  netherlands: "Netherlands",
  belgium: "Belgium",
  switzerland: "Switzerland",
  austria: "Austria",
};

export async function extractCountries(question: string): Promise<string[]> {
  const foundCountries: string[] = [];
  const questionLower = question.toLowerCase();

  // דפוסים לזיהוי מדינות בעברית
  const hebrewPatterns = [
    /ב(סין|גרמניה|גרמאניה|ארה"ב|ארהב|אמריקה|איטליה|ספרד|רוסיה|יפן|קוריאה|הודו|ברזיל|צרפת|בריטניה|הולנד|בלגיה|שוויץ|אוסטריה)/g,
    /(סין|גרמניה|גרמאניה|ארה"ב|ארהב|אמריקה|איטליה|ספרד|רוסיה|יפן|קוריאה|הודו|ברזיל|צרפת|בריטניה|הולנד|בלגיה|שוויץ|אוסטריה)/g,
  ];

  // דפוסים לזיהוי מדינות באנגלית
  const englishPatterns = [
    /in\s+(china|germany|usa|america|italy|spain|russia|japan|korea|india|brazil|france|uk|britain|netherlands|belgium|switzerland|austria)/g,
    /(china|germany|usa|america|italy|spain|russia|japan|korea|india|brazil|france|uk|britain|netherlands|belgium|switzerland|austria)/g,
  ];

  // חיפוש בעברית
  for (const pattern of hebrewPatterns) {
    const matches = questionLower.matchAll(pattern);
    for (const match of matches) {
      const countryName = match[1] || match[0];
      const cleanName = countryName.replace(/^ב/, ""); // הסר את הקידומת "ב"

      if (countryMap[cleanName]) {
        const englishName = countryMap[cleanName];
        if (!foundCountries.includes(englishName)) {
          foundCountries.push(englishName);
        }
      }
    }
  }

  // חיפוש באנגלית
  for (const pattern of englishPatterns) {
    const matches = questionLower.matchAll(pattern);
    for (const match of matches) {
      const countryName = match[1] || match[0];

      if (countryMap[countryName]) {
        const englishName = countryMap[countryName];
        if (!foundCountries.includes(englishName)) {
          foundCountries.push(englishName);
        }
      }
    }
  }

  console.log(`🔍 Found countries: ${foundCountries} in question: ${question}`);
  return foundCountries;
}

export async function extractCountry(question: string): Promise<string | null> {
  const countries = await extractCountries(question);
  return countries.length > 0 ? countries[0] : null;
}
