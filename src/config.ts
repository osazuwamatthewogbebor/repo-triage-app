import "dotenv/config"

export const CONFIG = {
    openRouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || "openrouter/free",
        baseUrl: "https://openrouter.ai/api/v1",
    },
    mistral: {
        apiKey: process.env.MISTRAL_API_KEY,
        model: process.env.MISTRAL_MODEL || "mistral-small-latest",
        baseUrl: "https://api.mistral.ai/v1"
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
        maxTurns: 8,
    },
};