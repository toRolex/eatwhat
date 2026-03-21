export type { AIProvider, SynthesisInput, SynthesisOutput, RestaurantCandidate, ProposalOutput } from './interface';
export { ClaudeAIProvider } from './adapters/claude';
export { buildSynthesisPrompt } from './prompts/restaurant-synthesis';
