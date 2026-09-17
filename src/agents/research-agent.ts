import { runAgentLoop } from "../core/agent.js";
import { sendDiscordNotification } from "../notifications/discord.js";
import { markAsProcessed, popNextFromQueue } from "../queue.js";
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
    

        const recommendation = await runAgentLoop({ 
            systemPrompt, 
            userPrompt,
            tools:researchOpenAIToolDefinitions,
            toolFunctions: researchToolRegistry,
        });

        await sendDiscordNotification(item, recommendation);
        markAsProcessed(item.id);

        return true;
}