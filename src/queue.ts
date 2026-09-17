import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

const QUEUE_FILE = path.resolve(process.cwd(), "queue.json");
const PROCESSED_FILE = path.resolve(process.cwd(), "processed.json");

// Validated schema for items stored inside queue.json.
// Stage 1 (GitHub Agent) creates this context payload, and Stage 2 (Research Agent) consumes it.

export const queueItemSchema = z.object({
    id: z.string().min(1),
    owner: z.string().min(1),
    repo: z.string().min(1),
    issueNumber: z.number().int().positive(),
    issueTitle: z.string().min(1),
    issueBody: z.string().default(""),
    labels: z.array(z.string()).default([]),
    repoDocs: z.string().optional().default(""),
    discoveredAt: z.iso.datetime().default(() => new Date().toISOString()),
});


export type QueueItem = z.infer<typeof queueItemSchema>;

interface ProcessedStore {
    processedIds: string[];
}

// Ensure storage JSON files wxist on disk with calid initial sturtures
function ensureStorageFilesExist(): void {
    if (!fs.existsSync(QUEUE_FILE)) {
        fs.writeFileSync(QUEUE_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
    if (!fs.existsSync(PROCESSED_FILE)) {
        fs.writeFileSync(PROCESSED_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
}

// Reads and parses all current items from queue.json
export function getQueue(): QueueItem[] {
    ensureStorageFilesExist();
    try {
        const raw = fs.readFileSync(QUEUE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return z.array(queueItemSchema).parse(parsed);
    } catch (error) {
        console.error("[Queue] Failed reading queue.json, returning empty array:", error);
        return [];
    }
}

// Reads and parses all current items from processed.json
export function getProcessedIds(): Set<string> {
    ensureStorageFilesExist();
    try {
        const raw = fs.readFileSync(PROCESSED_FILE, "utf-8");
        const data = JSON.parse(raw) as ProcessedStore;
        return new Set(data.processedIds ?? []);
    } catch (error) {
        console.error("[Queue] Failed reading queue.json, returning empty array:", error);
        return new Set();
    }
}

// Checks if an issue (e.g., "facebook/react#1234") has already been processed or queued.
export function isProcessedOrQueued(owner: string, repo: string, issueNumber: number): boolean {
    const targetId = `${owner}/${repo}#${issueNumber}`.toLowerCase();

    const processed = getProcessedIds();
    if (processed.has(targetId)) return true;

    const queue = getQueue();
    return queue.some((item) => item.id.toLowerCase() === targetId)
}

// Appends a new issue payload to queue.json after verifying deduplication
export function pushToQueue(item: Omit<QueueItem, "id" | "discoveredAt">): boolean {
    ensureStorageFilesExist();

    const id = `${item.owner}/${item.repo}#${item.issueNumber}`.toLowerCase();

    if (isProcessedOrQueued(item.owner, item.repo,item.issueNumber)) {
        console.log(`[Queue] Skipped duplicate issue: ${id}`);
        return false;
    }

    const validated = queueItemSchema.parse({
        ...item,
        id,
        discoveredAt: new Date().toISOString(),
    })

    const queue = getQueue();
    queue.push(validated);

    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf-8");
    console.log(`[Queue] Enqueued new issue: ${id}`);
    return true;
};

// Pops the next available QueueItem from the front of queue.json (FIFO).
export function popNextFromQueue(): QueueItem | null {
    ensureStorageFilesExist();

    const queue = getQueue();
    if (queue.length === 0) return null;

    const [nextItem, ...remaining] = queue;

    // Persist remaining items back to disk
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(remaining, null, 2), "utf-8");

    return nextItem as QueueItem;
}

// Marks an issue ID as completed by recording it in processed.json
export function markAsProcessed(id: string): void {
    ensureStorageFilesExist();

    const ProcessedSet = getProcessedIds();
    ProcessedSet.add(id.toLowerCase());

    const data: ProcessedStore = {
        processedIds: Array.from(ProcessedSet),
    };

    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(data, null , 2), "utf-8");
    console.log(`[Queue] Marked as processed: ${id}`);
}