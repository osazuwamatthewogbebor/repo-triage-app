import { OpenAI } from "openai";
import { CONFIG } from "../config.js";

export const mistralClient = new OpenAI({
    baseURL: CONFIG.mistral.baseUrl,
    apiKey: CONFIG.mistral.apiKey,
    defaultHeaders: {
        "HTTP-Referer": "http://github-triage-agent",
        "X-Title": "GitHub Triage Agent",
    }
});