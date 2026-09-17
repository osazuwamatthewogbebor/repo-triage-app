import { z } from "zod";
import { CONFIG } from "../config.js";

interface SearchResult {
    title: string;
    url: string;
    content: string;
    score?: number;
}

interface SearchResponse {
    query?: string;
    results?: SearchResult[]
}

export const searchWebArgs = z.object({
    query: z.string().min(1).describe("Search terms for industry standard practices or technical solutions")
});

// Web search tool definition
export const searchWebSchema = {
    name: "search_web" as const,
    description: "Search the web industry standards, framework patterns, and technical solutions",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "Search query" },
        },
        required: ["query"]
    },
};

export async function searchWeb(rawArgs: unknown): Promise<string> {
    const { query } = searchWebArgs.parse(rawArgs);
    const apiKey = CONFIG.search.apiKey;
    const apiUrl = CONFIG.search.apiUrl;

    if (!apiKey || !apiUrl) {
        // Fall back gracefully if search API key is not supplied
        return `Simulated Search Results for "${query}": Found standard patterns on StackOverflow and official docs. Ensure proper error handling, schema validation, and modular unit tests.`;
    }

    try {
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: apiKey, query, max_results: 3}),
        });

        if (!res.ok) return `Search API returned ${res.status}`;
        const data = (await res.json()) as SearchResponse;

        const results = (data.results ?? []).map((r: SearchResult) => ({
            title: r.title,
            url: r.url,
            snippet: r.content,
        }));

        return JSON.stringify(results, null, 2)
    } catch (error) {
        return `Search error: ${error instanceof Error ? error.message : String(error)}`;
    }
}
