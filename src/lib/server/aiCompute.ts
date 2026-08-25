// Shared AI-inference client for /api/mentor and /api/breakdown — Groq by
// default, 0G Compute Router when USE_0G_COMPUTE=true and fully configured.
// groq-sdk's client accepts a baseURL override and 0G's Router is documented
// as an OpenAI-SDK drop-in, so the same client class serves both backends.
// See docs-project/0g-compute-integration-findings.md for the full research
// behind this (testnet/mainnet URLs, contract addresses, setup steps).
import { env } from '$env/dynamic/private';
import { GROQ_API_KEY } from '$env/static/private';
import Groq from 'groq-sdk';

const GROQ_MODEL = 'openai/gpt-oss-120b';

export function getAiClient(): { client: Groq; model: string; via: '0g' | 'groq' } {
	const wants0G = env.USE_0G_COMPUTE === 'true';
	const apiKey = env.ZG_COMPUTE_API_KEY;
	const baseURL = env.ZG_COMPUTE_BASE_URL;
	const model = env.ZG_COMPUTE_MODEL;

	if (wants0G && apiKey && baseURL && model) {
		return { client: new Groq({ apiKey, baseURL }), model, via: '0g' };
	}

	if (wants0G) {
		console.warn(
			'[ai] USE_0G_COMPUTE is true but ZG_COMPUTE_API_KEY/ZG_COMPUTE_BASE_URL/ZG_COMPUTE_MODEL are not all set — falling back to Groq'
		);
	}

	return { client: new Groq({ apiKey: GROQ_API_KEY }), model: GROQ_MODEL, via: 'groq' };
}
