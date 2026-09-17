import "dotenv/config"

export const CONFIG = {
    openRouter: {
        apiKey: process.env.OPENROUTER_API_KEY || "",
        model: process.env.OPENROUTER_MODEL || "openrouter/free",
        baseUrl: "https://openrouter.ai/api/v1",
    },
    mistral: {
        apiKey: process.env.MISTRAL_API_KEY || "",
        model: process.env.MISTRAL_MODEL || "mistral-small-latest",
        baseUrl: "https://api.mistral.ai/v1"
    },
    llm: {
        // Providers to try in order — first is primary, the rest are fallbacks.
        order: process.env.LLM_PROVIDER_ORDER || "mistral,openrouter",
    },
    github: {
        clientId: process.env.GITHUB_CLIENT_ID || "",
        token: process.env.GITHUB_TOKEN || "",
    },
    discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || "",
    },
    search: {
        apiKey: process.env.SEARCH_API_KEY || "",
        apiUrl: process.env.SEARCH_API_ENDPOINT || "",
    },
    agent: {
        maxTurns: Number(process.env.MAX_TURNS),
        // Caps the provider's output reservation. Without it OpenRouter reserves
        // the routed model's full ceiling and rejects the request with a 402.
        maxTokens: Number(process.env.LLM_MAX_TOKENS || 2000),
    },
};