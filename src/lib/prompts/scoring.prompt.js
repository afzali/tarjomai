export function getScoringPrompt(sourceText, translations, targetLanguage) {
  const translationsList = translations
    .map((t, i) => `Translation ${i + 1} (${t.modelName}):\n"""${t.translation}"""`)
    .join('\n\n');

  return `You are an expert translation evaluator.

Task: Evaluate and score the following translations from the source text to ${targetLanguage}.

Source Text:
"""
${sourceText}
"""

${translationsList}

Evaluate each translation on these criteria (score 1-10):
1. Accuracy: How accurately does it convey the original meaning?
2. Fluency: How natural and fluent is the translation?
3. Style: How well does it preserve the original style and tone?
4. Grammar: How correct is the grammar and syntax?

Respond with a JSON array containing scores for each translation:
[
  {
    "modelName": "Model Name",
    "accuracy": 8,
    "fluency": 7,
    "style": 8,
    "grammar": 9,
    "overall": 8,
    "notes": "Brief evaluation notes"
  }
]

Important:
1. Respond ONLY with valid JSON
2. Be objective and fair in your evaluation
3. Consider cultural appropriateness for the target language`;
}

export function getComparisonPrompt(sourceText, translation1, translation2, targetLanguage) {
  return `Compare these two translations and determine which is better.

Source Text:
"""
${sourceText}
"""

Translation A:
"""
${translation1}
"""

Translation B:
"""
${translation2}
"""

Target Language: ${targetLanguage}

Respond with JSON:
{
  "winner": "A" or "B" or "tie",
  "reason": "Brief explanation",
  "aScore": 1-10,
  "bScore": 1-10
}`;
}

export default getScoringPrompt;
