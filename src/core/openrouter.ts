import { OpenAI } from "openai";
import { CONFIG } from "../config.js";

export const openRouterClient = new OpenAI({
    baseURL: CONFIG.openRouter.baseUrl,
    apiKey: CONFIG.openRouter.apiKey,
    defaultHeaders: {
        "HTTP-Referer": "http://github-triage-agent",
        "X-Title": "GitHub Triage Agent",
    }
});