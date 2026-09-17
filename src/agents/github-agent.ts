import { runAgentLoop } from "../core/agent.js";
import { isProcessedOrQueued, pushToQueue } from "../queue.js";
import { getRepoFile } from "../tools/github.js";
import { githubOpenAIToolDefinitions, githubToolRegistry } from "../tools/registry.js";
import { discoveredIssueSchema } from "../tools/validation.js";
import { z } from "zod";

export async function runGitHubDiscoveryStage(topicQuery: string): Promise<number> {
    console.log(`\n=== Stage 1: Discovering Issues for topic "${topicQuery}" ===\n`);

    const systemPrompt =
        "You are a GitHub discovery agent. Your goal is to find public repos matching user topics, " +
        "search for unassigned open issues (with labels like 'help wanted' or 'good first issue'), " +
        "and identify issues suitable for research. Return a JSON array of discovered objects matching: " +
        "[{ owner, repo, issueNumber, title, body, labels }]. Do not output markdown codeblocks outside JSON.";

    const userPrompt = `Find 2-3 open issues in active repositories matching query: "${topicQuery}".`;

    const rawResult = await runAgentLoop({ 
        systemPrompt, 
        userPrompt, 
        tools:githubOpenAIToolDefinitions, 
        toolFunctions:githubToolRegistry 
    });

    let enqueuedCount = 0;

    try {
        const jsonMatch = rawResult.match(/\[.*\]/s);
        const parsed = z.array(discoveredIssueSchema).safeParse(
            JSON.parse(jsonMatch ? jsonMatch[0] : rawResult)
        );
        if (!parsed.success) {
            console.error("[Stage 1] LLM returned unusable issues:", parsed.error.issues);
            return 0;
        };

        const issues = parsed.data;

        for (const issue of issues) {
            if (!isProcessedOrQueued(issue.owner, issue.repo, issue.issueNumber)) {
                // Fetch CONTRIBUTING.md or README to attach context
                let docs = ""
                try {
                    docs = await getRepoFile({ owner: issue.owner, repo: issue.repo, path: "CONTRIBUTING.md" });
                    if (docs.startsWith("Error")) {
                        docs = await getRepoFile({ owner: issue.owner, repo: issue.repo, path: "README.md" });
                    }
                } catch {
                    docs = "No repo docs available.";
                }

                const added = pushToQueue({
                    owner: issue.owner,
                    repo: issue.repo,
                    issueNumber: issue.issueNumber,
                    issueTitle: issue.title,
                    issueBody: issue.body || "",
                    labels: issue.labels || [],
                    repoDocs: docs.slice(0, 2000),
                });

                if (added) enqueuedCount++;
            }
        }
    } catch (error) {
        console.error("[Stage 1] Failed parsing discovered issues JSON from LLM output:", rawResult);
    }
    return enqueuedCount;
}