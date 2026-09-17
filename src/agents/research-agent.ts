import { runAgentLoop } from "../core/agent.js";
import { getProviderChain, withFailover } from "../core/providers.js";
import { sendDiscordNotification } from "../notifications/discord.js";
import { markAsProcessed, popNextFromQueue, pushToQueue } from "../queue.js";
import { researchOpenAIToolDefinitions, researchToolRegistry } from "../tools/registry.js";

export async function processQueueNextStage(): Promise<boolean> {
    const item = popNextFromQueue();

    if (!item) {
        console.log("[Stage 2] Queue is empty. No pending issues to process.");
        return false;
    }

    console.log(`\n=== Stage 2: Researching issue ${item.id} ===\n`);

    const systemPrompt =
        "You are a Senior Staff Engineer. Research technical issues using `search_web` to find industry best practices, " +
        "compare them against project standards provided in REPO DOCS, and output a concise actionable implementation guide.";

    const userPrompt = `
        Issue Title: ${item.issueTitle}
        Repository: ${item.owner}/${item.repo}
        Issue Body:
        ${item.issueBody}

        Project Standards / Docs:
        ${item.repoDocs}

        Provide a structured plan with:
        1. Problem Summary
        2. Recommended Technical Approach (citing industry standards)
        3. Step-by-Step Implementation Steps matching project conventions.
        `;

    const outcome = await withFailover(
        getProviderChain(),
        (llm) => runAgentLoop({
            systemPrompt,
            userPrompt,
            provider: llm,
            tools: researchOpenAIToolDefinitions,
            toolFunctions: researchToolRegistry,
        }),
        (text) => text.trim().length > 0,
    ).catch((error: unknown) => {
        // Research failed on every provider, so nothing was posted and the item is
        // not marked processed. popNextFromQueue already removed it from disk, so
        // put it back rather than dropping it silently.
        const requeued = pushToQueue({
            owner: item.owner,
            repo: item.repo,
            issueNumber: item.issueNumber,
            issueTitle: item.issueTitle,
            issueBody: item.issueBody,
            labels: item.labels,
            repoDocs: item.repoDocs,
        });

        if (!requeued) {
            console.error(`[Stage 2] Could not requeue ${item.id}; the issue has been dropped.`);
        }

        throw error;
    });

    console.log(`[Stage 2] Recommendation produced by ${outcome.provider.name}.`);

    await sendDiscordNotification(item, outcome.result);
    markAsProcessed(item.id);

    return true;
}
