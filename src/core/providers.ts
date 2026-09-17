import { OpenAI } from "openai";
import { CONFIG } from "../config.js";

export const PROVIDER_NAMES = ["openrouter", "mistral"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

export interface LlmProvider {
    readonly name: ProviderName;
    readonly client: OpenAI;
    readonly model: string;
    readonly maxTokens: number;
}

export interface FailoverResult<T> {
    provider: LlmProvider;
    result: T;
}

interface ProviderSpec {
    baseUrl: string;
    apiKey: string;
    model: string;
    maxTokens: number;
    /** Only the headers this provider actually reads. */
    defaultHeaders: Record<string, string>;
}

const ENV_KEYS: Record<ProviderName, string> = {
    openrouter: "OPENROUTER_API_KEY",
    mistral: "MISTRAL_API_KEY",
};

const DEFAULT_ORDER: ProviderName[] = ["mistral", "openrouter"];

// Every provider here speaks the OpenAI wire format, so a descriptor is all the
// "strategy" each one needs — the resolver below turns it into a ready client.
const SPECS: Record<ProviderName, () => ProviderSpec> = {
    openrouter: () => ({
        baseUrl: CONFIG.openRouter.baseUrl,
        apiKey: CONFIG.openRouter.apiKey,
        model: CONFIG.openRouter.model,
        maxTokens: CONFIG.agent.maxTokens,
        // OpenRouter reads these for app attribution; other providers don't.
        defaultHeaders: {
            "HTTP-Referer": "http://github-triage-agent",
            "X-Title": "GitHub Triage Agent",
        },
    }),
    mistral: () => ({
        baseUrl: CONFIG.mistral.baseUrl,
        apiKey: CONFIG.mistral.apiKey,
        model: CONFIG.mistral.model,
        maxTokens: CONFIG.agent.maxTokens,
        defaultHeaders: {},
    }),
};

const cache = new Map<ProviderName, LlmProvider>();

function isProviderName(value: string): value is ProviderName {
    return (PROVIDER_NAMES as readonly string[]).includes(value);
}

// Parses "mistral,openrouter". Unknown names are rejected, never silently dropped. //
export function parseProviderOrder(raw: string): ProviderName[] {
    const names = raw.split(",").map((part) => part.trim()).filter(Boolean);
    const unknown = names.filter((name) => !isProviderName(name));

    if (unknown.length > 0) {
        throw new Error(
            `Unknown provider(s) in LLM_PROVIDER_ORDER: ${unknown.join(", ")}. ` +
            `Valid names: ${PROVIDER_NAMES.join(", ")}.`
        );
    }

    return names.length > 0 ? (names as ProviderName[]) : DEFAULT_ORDER;
}

//  Builds the client for one provider on first use.

//  Deliberately lazy: `new OpenAI({ apiKey: undefined })` throws, so eagerly
//  constructing every provider at module load would break startup unless every
//  API key is set. Here a missing key only matters if you actually ask for it.

export function getProvider(name: ProviderName): LlmProvider {
    const cached = cache.get(name);
    if (cached) return cached;

    const spec = SPECS[name]();
    if (!spec.apiKey) {
        throw new Error(
            `Missing API key for provider "${name}". Set ${ENV_KEYS[name]} in your .env file.`
        );
    }

    const provider: LlmProvider = {
        name,
        client: new OpenAI({
            baseURL: spec.baseUrl,
            apiKey: spec.apiKey,
            defaultHeaders: spec.defaultHeaders,
        }),
        model: spec.model,
        maxTokens: spec.maxTokens,
    };

    cache.set(name, provider);
    return provider;
}

// Providers to try, in order. Providers whose key is unset are skipped with a
// warning rather than throwing, so a single configured provider still runs —
// it just has no fallback.

export function getProviderChain(): LlmProvider[] {
    const names = parseProviderOrder(CONFIG.llm.order);
    const available: LlmProvider[] = [];

    for (const name of names) {
        if (!SPECS[name]().apiKey) {
            console.warn(`[Providers] Skipping "${name}": ${ENV_KEYS[name]} is not set.`);
            continue;
        }
        available.push(getProvider(name));
    }

    if (available.length === 0) {
        throw new Error(
            `No LLM provider is configured. Set at least one of: ` +
            `${names.map((name) => ENV_KEYS[name]).join(", ")}.`
        );
    }

    return available;
}

// Runs `attempt` against each provider in order, returning the first usable
// result. A provider is exhausted when `attempt` throws or when `isUsable`
// rejects what it returned; either way the chain advances and the reason is
// logged. If every provider is exhausted, throws an error naming each failure.
 
export async function withFailover<T>(
    chain: LlmProvider[],
    attempt: (provider: LlmProvider) => Promise<T>,
    isUsable: (result: T) => boolean = () => true,
): Promise<FailoverResult<T>> {
    const failures: string[] = [];

    for (const provider of chain) {
        try {
            const result = await attempt(provider);
            if (isUsable(result)) {
                return { provider, result };
            }

            failures.push(`${provider.name}: response was unusable`);
            console.warn(`[Failover] ${provider.name} returned an unusable response; trying next provider.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            failures.push(`${provider.name}: ${message}`);
            console.warn(`[Failover] ${provider.name} failed: ${message}`);
        }
    }

    throw new Error(`All LLM providers failed:\n  - ${failures.join("\n  - ")}`);
}
