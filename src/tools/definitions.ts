// Tool definitions

import { searchWebSchema } from "./search.js";

export const searchReposSchema = {
    name: "search_repos" as const,
    description: "Search public GitHub repositories matching specific topics, languages or update criteria.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "Search query string (e.g 'language:typescript stars:>500')" },
            sort: { type: "string", enum: ["stars", "forks", "updated"], description: "Field to sort by" },
            limit: { type: "number", description: "Maximum repositories to return (1-15)" },
        },
        required: ["query"]
    },
};


export const listOpenIssuesSchema = {
    name: "list_open_issues" as const,
    description: "Fetch recent open issues from a repository",
    parameters: {
        type: "object",
        properties: {
            owner: { type: "string", description: "Repository owner username or organisation" },
            repo: { type: "string", description: "Repository name" },
            limit: { type: "number", description: "Max issues to return (1-30)" },
        },
        required: ["owner", "repo"],
    },

}

export const searchIssuesSchema = {
    name: "search_issues" as const,
    description: "Search issues inside a specific repository using GitHub search terms(e.g., label or state).",
    parameters: {
        type: "object",
        properties: {
            owner: { type: "string", description: "Repository owner username or organisation" },
            repo: { type: "string", description: "Repository name" },
            query: { type: "string", description: "Search criteria (e.g. 'label:\"help wanted\" state:open')" },
            limit: { type: "number", description: "Max results to return (1-20)"  },
        },
        required: ["owner", "repo", "query"],
    },

}

export const getRepoFileSchema = {
    name: "get_repo_file" as const,
    description: "Fetch contents of project files (e.g., CONTRIBUTING.md, README.md, package.json) to extract standards.",
    parameters: {
        type: "object",
        properties: {
            owner: { type: "string" , description: "Repository owner username or organisation" },
            repo: { type: "string", description: "Repository name" },
            path: { type: "string", description: "File path within repository (default: 'README.md')" },
        },
        required: ["owner", "repo", "path"],
    },
};

export const githubToolSchema = [
    searchReposSchema,
    listOpenIssuesSchema,
    searchIssuesSchema,
    getRepoFileSchema,
]

export const researchToolSchema = [
    searchWebSchema
]