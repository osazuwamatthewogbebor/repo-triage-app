import type OpenAI from "openai";
import { githubToolSchema, researchToolSchema } from "./definitions.js";
import { getRepoFile, listOpenIssues, searchIssues, searchRepos } from "./github.js";
import { searchWeb } from "./search.js";

export type ToolFunctionType = (rawArgs: unknown) => Promise<string>;
export type ToolRegistryType = Record<string, ToolFunctionType>

export type ToolDefinitions = OpenAI.ChatCompletionTool[];

// Central dictionary mapping OpenAI tool function to their implementations.
// `satisfies` rather than a `: ToolRegistryType` annotation: it checks the shape
// but keeps the literal keys, which is what the guard below compares against.
export const githubToolRegistry = {
    search_repos: searchRepos,
    list_open_issues: listOpenIssues,
    search_issues: searchIssues,
    get_repo_file: getRepoFile,
} satisfies ToolRegistryType;

export const researchToolRegistry = {
    search_web: searchWeb,
} satisfies ToolRegistryType;

// Compile-time guard: every tool advertised in the schemas must have an
// implementation in the registry. The two sides are separate literals, so
// nothing else stops someone adding a schema and forgetting the function.
// `never` passes the constraint; any leftover name fails the build. Exported so
// they read as part of the module surface rather than as dead code.
type AssertNever<T extends never> = T;

export type GithubToolsImplemented = AssertNever<
    Exclude<(typeof githubToolSchema)[number]["name"], keyof typeof githubToolRegistry>
>;

export type ResearchToolsImplemented = AssertNever<
    Exclude<(typeof researchToolSchema)[number]["name"], keyof typeof researchToolRegistry>
>;


// Schema definitions in OpenAI-compatible tool format
export const githubOpenAIToolDefinitions: ToolDefinitions = githubToolSchema.map((schema) => ({
    type: "function" as const,
    function: schema,
}));

export const researchOpenAIToolDefinitions: ToolDefinitions = researchToolSchema.map((schema) => ({
    type: "function" as const,
    function: schema,
}));

