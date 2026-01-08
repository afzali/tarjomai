export function getStyleAnalysisPrompt(text, options = {}) {
  const analyzeItems = [];
  
  if (options.tone !== false) analyzeItems.push('tone (formal, informal, literary, scientific, conversational)');
  if (options.vocabulary !== false) analyzeItems.push('vocabularyLevel (simple, medium, advanced)');
  if (options.structure !== false) analyzeItems.push('sentenceStructure (short, medium, long, mixed)');
  if (options.style !== false) analyzeItems.push('translationType (literal, balanced, free)');

  return `You are an expert linguist and writing style analyst.

Analyze the writing style of the following text and provide a JSON response with these fields:
${analyzeItems.map(item => `- ${item}`).join('\n')}
- fidelity: string (low, medium, high, literal) - how closely should translation follow the original
- customRules: array of specific rules or notes for translation (max 5 items)

Text to analyze:
"""
${text}
"""

Important:
1. Respond ONLY with valid JSON, no explanations
2. Be specific and accurate in your analysis
3. Consider the cultural and linguistic context
4. Provide actionable translation guidelines in customRules

Example response format:
{
  "tone": ["formal", "scientific"],
  "vocabularyLevel": "advanced",
  "sentenceStructure": "long",
  "translationType": "balanced",
  "fidelity": "high",
  "customRules": [
    "Preserve technical terminology",
    "Maintain formal register"
  ]
}`;
}

export default getStyleAnalysisPrompt;
