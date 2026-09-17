// Type signature for executable tool functions.
// All functions accept an unvalidated `unknown` argument (parsed via Zod inside the function)
// and return a JSON string result or readable error message.

import { githubToolSchema } from "./definitions.js";
import { getRepoFile, listOpenIssues, searchIssues, searchRepos } from "./github.js";
import { searchWeb, searchWebSchema } from "./search.js";

export type ToolFunctionType = (rawArgs: unknown) => Promise<string>;
export type ToolRegistryType = Record<string, ToolFunctionType>

// Central dictionary mapping OpenAI tool function to their implementations.

// 1. GitHub tools
export const githubToolRegistry: ToolRegistryType = {
    search_repos: searchRepos,
    list_open_issues: listOpenIssues,
    search_issues: searchIssues,
    get_repo_file: getRepoFile,
};

// 2. Research tools
export const researchToolRegistry: ToolRegistryType = {
    search_web: searchWeb,
};


// Schema definitions
// Export schemas in OpenAI-compatible tool format

// GitHub Schemas
export const githubOpenAIToolDefinitions = githubToolSchema.map((schema) => ({
    type: "function" as const,
    function: schema,
}));

// Research Schemas
export const researchOpenAIToolDefinitions = [searchWebSchema].map((schema) => ({
    type: "function" as const,
    function: schema,
}));

