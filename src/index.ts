import { runGitHubDiscoveryStage } from "./agents/github-agent.js";
import { processQueueNextStage } from "./agents/research-agent.js";
import { getQueue } from "./queue.js";

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || "help";

    switch (command) {
        case "discover": {
            const query = args.slice(1).join(" ").trim() || "language:typescript topic:react";
            console.log(`Running Stage 1 Discovery with query: "${query}"`);
            const enqueued = await runGitHubDiscoveryStage(query);
            console.log(`Finished discovery stage. ${enqueued} new items enqueued.`);
            break;
        }

        case "process": {
            console.log("Running Stage 2 Processing on queued items...");
            const processed = await processQueueNextStage();
            if (!processed) {
                console.log("Nothing was processed.");
            }
            break;
        }

        case "run-all": {
            const query = args.slice(1).join(" ").trim() || "language:typesscript";
            console.log("=== Running Pipeline: Stage 1 -> Queue -> Stage 2 ===");
            await runGitHubDiscoveryStage(query);

            let count = 0;
            while (await processQueueNextStage()) {
                count++
            }

            console.log(`Pipeline complete. Processed ${count} items.`);
            break;
        }

        case "status": {
            const pending = getQueue();
            console.log(`\n=== Queue Status ===`);
            console.log(`Pending items in queue: ${pending.length}`);
            pending.forEach((item, index) => {
                console.log(` ${index + 1}. [${item.id}] ${item.issueTitle}`)
            });
            console.log("");
            break;
        }

        default:
            console.log(`
                GitHub Triage Agent CLI

                Commands:
                npm run dev -- discover "<query>"   Run Stage 1 to discover issues and push to queue.
                npm run dev -- process              Run Stage 2 to pop 1 item, research, and post to Discord.
                npm run dev -- run-all "<query>"    Run Stage 1 discovery and process all items in queue sequentially.
                npm run dev -- status               Show all pending items in queue.json.
            `);

            break;
    }
}

main().catch((error) => {
    console.error("Fatal Pipeline Error:", error);
    process.exit(1);
})