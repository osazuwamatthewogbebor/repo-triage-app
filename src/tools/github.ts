import { getGithubToken } from "../auth.js";
import {
    searchReposArgs,
    listOpenIssuesArgs,
    searchIssuesArgs,
    getRepoFileArgs,
} from "./validation.js";


type GitHubLabel = string | { name?: string };

interface GitHubRepoSearchResponse {
    total_count: number;
    incomplete_results: boolean;
    items: Array<{
        full_name: string;
        description: string | null;
        stargazers_count: number;
        open_issues_count: number;
        language: string | null;
        updated_at: string;
    }>;
}


interface GitHubIssue {
    number: number;
    title: string;
    body: string | null;
    labels: GitHubLabel[];
    comments: number;
    updated_at: string;
    state: "open" | "closed";
    /** Present when the "issue" is actually a pull request. */
    pull_request?: { url: string };
}

interface GitHubIssueSearchResponse {
    total_count: number;
    incomplete_results: boolean;
    items: GitHubIssue[];
}

interface GitHubContentFile {
    type: string;
    encoding?: string;
    content?: string;
    name: string;
    path: string;
    size: number;
}


const GITHUB_API = "https://api.github.com";



async function makeGithubFetch(endpoint: string): Promise<Response> {
    let headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "github-triage-agent"
    };

    try {
        const token = await getGithubToken();
        if (token) headers["Authorization"] = `Bearer ${token}`
    } catch (error) {
        // Falls back to unauthenticated public API calls if no token present
        console.log("No token present", error);
    }

    return fetch(`${GITHUB_API}${endpoint}`, { headers });
};

// Function to search and retrieve repos
export async function searchRepos(rawArgs: unknown): Promise<string> {
    const { query, sort, limit } = searchReposArgs.parse(rawArgs);
    const url = `/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=${limit}`;

    const res = await makeGithubFetch(url);
    if (!res.ok) return `Error searching repos: GitHub returned ${res.status} ${res.statusText}`;

    const data = (await res.json()) as GitHubRepoSearchResponse;
    const repos = (data.items ?? []).map((r: any) => ({
        full_name: r.full_name,
        description: r.description,
        stars: r.stargazers_count,
        open_issues: r.open_issues_count,
        language: r.language,
        updated_at: r.updated_at
    }));

    return JSON.stringify(repos, null, 2);
}

export async function listOpenIssues(rawArgs: unknown): Promise<string> {
    const { owner, repo, limit } = listOpenIssuesArgs.parse(rawArgs);
    const url = `/repos/${owner}/${repo}/issues?state=open&sort=updated&direction=desc&per_page=${limit}`;

    const res = await makeGithubFetch(url);
    if (res.status === 404) return `Error: Repo "${owner}/${repo}" not found.`;
    if (!res.ok) return `Error fetching issues: GitHub returned ${res.status}`;

    const issues = (await res.json()) as GitHubIssue[];
    const onlyIssues = issues.filter((i: any) => !i.pull_request);

    return JSON.stringify(
        onlyIssues.map((i: any) => ({
            number: i.number,
            title: i.title,
            labels: (i.labels ?? []).map((l: any) => (typeof l === "string" ? l : l.name)),
            comments: i.comments,
            updated_at: i.updated_at,
        })),
        null,
        2
    )
};

export async function searchIssues(rawArgs: unknown): Promise<string> {
    const { owner, repo, query, limit } = searchIssuesArgs.parse(rawArgs);
    const q = `repo:${owner}/${repo} ${query}`;
    const url = `/search/issues?q=${encodeURIComponent(q)}&per_page=${limit}`;

    const res = await makeGithubFetch(url);
    if (!res.ok) return `Error searching issues: GitHub returned $res.status`;

    const data = (await res.json()) as GitHubIssueSearchResponse;
    const issues = (data.items ?? []).map((i: any) => ({
        number: i.number,
        title: i.title,
        body: i.body ? i.body.slice(0, 300) + "..." : "(no body)",
        labels: (i.labels ?? []).map((l: any) => (typeof l === "string" ? l : l.name)),
        state: i.state,
    }));

    return JSON.stringify(issues, null, 2);
};

export async function getRepoFile(rawArgs: unknown): Promise<string> {
    const { owner, repo, path } = getRepoFileArgs.parse(rawArgs);
    const url = `/repos/${owner}/${repo}/contents/${path}`;

    const res = await makeGithubFetch(url);
    if (res.status === 404) return `Error: File "${path}" not found in ${owner}/${repo}.`;
    if (!res.ok) return `Error fetching file: GitHub returned ${res.status}`;

    const data = (await res.json()) as GitHubContentFile;
    if (data.encoding === "base64" && data.content) {
        const content = Buffer.from(data.content, "base64").toString("utf-8");
        return content.length > 4000 ? content.slice(0, 4000) + "\n\n[...Truncated" : content;
    }

    return `Error: File "${path}" is binary or cannot be text decoded.`
};