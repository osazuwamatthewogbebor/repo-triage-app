import "dotenv/config"

export const CONFIG = {
    openROuter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || "openrouter/auto",
        baseUrl: "https://openrouter.ai/api/v1",
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
    },
    agent: {
        maxTurns: 8,
    },
};