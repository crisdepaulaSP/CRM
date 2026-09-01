import { AiError, type ProviderResult } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

interface OpenAiResponse {
  choices?: { message?: { content?: string } }[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

/**
 * Turn the account's configured base URL into the chat-completions
 * endpoint. Accepts it with or without a trailing slash, and with or
 * without the `/chat/completions` suffix already appended (people paste
 * both forms from provider docs).
 */
export function resolveChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (/\/chat\/completions$/.test(trimmed)) return trimmed
  return `${trimmed}/chat/completions`
}

/**
 * Call any OpenAI-compatible Chat Completions endpoint (Groq, OpenRouter,
 * Together, DeepSeek, a local Ollama, …) with the caller's own key and
 * base URL. Wire format is identical to `generateOpenAi`; only the URL
 * differs — which is exactly why hosting a bespoke adapter per provider
 * isn't worth it.
 */
export async function generateOpenAiCompatible(
  args: ProviderArgs,
): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs, baseUrl } = args

  if (!baseUrl || !baseUrl.trim()) {
    throw new AiError(
      'This provider needs a base URL (e.g. https://api.groq.com/openai/v1).',
      { code: 'missing_base_url', status: 400 },
    )
  }

  let res: Response
  try {
    res = await fetch(resolveChatCompletionsUrl(baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...mergeConsecutive(messages),
        ],
        // OpenAI renamed this to `max_completion_tokens`; every
        // compatible host still accepts the original `max_tokens`, and
        // some (Groq, older Ollama) only accept that one.
        max_tokens: MAX_OUTPUT_TOKENS,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await providerHttpError('AI provider', res)
  }

  const data = (await res.json().catch(() => null)) as OpenAiResponse | null
  const text = data?.choices?.[0]?.message?.content
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new AiError('The AI provider returned an empty response.', {
      code: 'empty_response',
    })
  }
  const usage = normalizeUsage({
    prompt: data?.usage?.prompt_tokens,
    completion: data?.usage?.completion_tokens,
    total: data?.usage?.total_tokens,
  })
  return { text, usage }
}
