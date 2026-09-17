import { CONFIG } from "../config.js";
import type { QueueItem } from "../queue.js";


export async function sendDiscordNotification(item: QueueItem, recommendation: string): Promise<void> {
    const webhookUrl = CONFIG.discord.webhookUrl;

    if (!webhookUrl) {
        console.log("\n--- [DISCORD NOTIFICATION (DRY RUN)] ---");
        console.log(`Target: ${item.owner}/${item.repo}#${item.issueNumber}`);
        console.log(`Title: ${item.issueTitle}`);
        console.log(`Recommendation:\n${recommendation}`);
        console.log("------------------------------------------\n");
        return;
    }

    const embed = {
        title: `[Triage Recommendation] ${item.owner}/${item.repo}#${item.issueNumber}`,
        url: `https://github.com/${item.owner}/${item.repo}/issues/${item.issueNumber}`,
        description: recommendation.slice(0, 4000), // Discord max character cap
        color: 0x5865f2,
        fields: [
            { name: "Repository", value: `${item.owner}/${item.repo}`, inline: true },
            { name: "Labels", value: item.labels.join(", ") || "None", inline: true },
        ],
        timestamp: new Date().toISOString(),
    };

    const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
        throw new Error(`Failed to post to Discord webhook: ${res.status} ${res.statusText}`);
    }

    console.log(`[Discord] Successfully sent to recommendation for ${item.id}`);
}