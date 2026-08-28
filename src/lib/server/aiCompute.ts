// Shared AI-inference client for /api/mentor, /api/breakdown and the AI draft
// agent — Groq by default, 0G Compute Router when USE_0G_COMPUTE=true and
// fully configured. See docs-project/0g-compute-integration-findings.md for
// the research behind this (testnet/mainnet URLs, contract addresses, setup).
//
// ⚠️ Why call sites must use `createChatCompletion()` and not
// `client.chat.completions.create()` directly:
//
// groq-sdk HARDCODES the request path as `/openai/v1/chat/completions`
// (node_modules/groq-sdk/src/resources/chat/completions.ts). That's correct
// for api.groq.com, but appending it to 0G's baseURL (which already ends in
// `/v1`) produces `.../v1/openai/v1/chat/completions` — a 404. The 0G Router
// expects `/v1/chat/completions`.
//
// Found live 2026-08-28: the very first real request through the app on the
// 0G path 404'd, despite the endpoint having been curl-verified as healthy.
// Prior verification had only ever hit the Router directly, never through
// groq-sdk, so this was invisible until the flag was actually flipped.
//
// Fix: reuse groq-sdk's HTTP/auth/streaming layer via its generic `.post()`,
// just with the correct path. No new dependency, and the 0G Router is
// OpenAI-shaped so the request/response bodies are already identical.
import { env } from '$env/dynamic/private';
import { GROQ_API_KEY } from '$env/static/private';
import Groq from 'groq-sdk';
import type { ChatCompletion, ChatCompletionChunk } from 'groq-sdk/resources/chat/completions';
import type { Stream } from 'groq-sdk/lib/streaming';

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

type ChatParams = {
	messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
	max_tokens?: number;
	temperature?: number;
	stream?: boolean;
};

/**
 * Backend-agnostic chat completion. Routes to the right path for whichever
 * provider is active (see the path note at the top of this file) and injects
 * that provider's model, so call sites never hardcode either.
 */
export function createChatCompletion(
	params: ChatParams & { stream: true }
): Promise<Stream<ChatCompletionChunk>>;
export function createChatCompletion(
	params: ChatParams & { stream?: false }
): Promise<ChatCompletion>;
export function createChatCompletion(
	params: ChatParams
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
	const { client, model, via } = getAiClient();
	const body = { ...params, model };

	if (via === '0g') {
		return client.post('/chat/completions', {
			body,
			stream: params.stream ?? false
		}) as Promise<ChatCompletion | Stream<ChatCompletionChunk>>;
	}

	return client.chat.completions.create(
		body as Parameters<typeof client.chat.completions.create>[0]
	) as Promise<ChatCompletion | Stream<ChatCompletionChunk>>;
}
