import { z } from "zod";


export const searchReposArgs = z.object({
    query: z.string().min(1).describe("Search query, e.g., 'topic:react language:typescript'"),
    sort: z.enum(["stars", "forks", "updated"]).default("updated"),
    limit: z.number().int().min(1).max(15).default(5),
});


export const listOpenIssuesArgs = z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    limit: z.number().int().min(1).max(30).default(10),
})

export const searchIssuesArgs = z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    query: z.string().min(1).describe("Filter terms, e.g. 'label:\"good first issue\" state:open"),
    limit:  z.number().int().min(1).max(20).default(5),
})

export const getRepoFileArgs = z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    path: z.string().min(1).default("README.md"),
})
