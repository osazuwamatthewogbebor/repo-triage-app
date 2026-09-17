import type OpenAI from "openai";
import { CONFIG } from "../config.js";
import { githubOpenAIToolDefinitions, githubToolRegistry, type ToolRegistryType } from "../tools/registry.js";
import { openRouterClient } from "./openrouter.js";

export interface AgentRunOptions {
    systemPrompt: string;
    userPrompt: string;
    tools?: typeof githubOpenAIToolDefinitions;
    toolFunctions?: ToolRegistryType;
    model?: string;
    maxTurns?: number;
}


export async function runAgentLoop({
    systemPrompt,
    userPrompt,
    tools = githubOpenAIToolDefinitions,
    toolFunctions = githubToolRegistry,
    model = CONFIG.openRouter.model,
    maxTurns = CONFIG.agent.maxTurns
}: AgentRunOptions): Promise<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    for (let turn = 0; turn < maxTurns; turn++) {
        const response = await openRouterClient.chat.completions.create({
            model,
            messages,
            max_tokens: 2000,
            ...(tools.length > 0 ? {tools} : {}),
        });

        const choice = response.choices[0];
        if (!choice) {
            throw new Error("OpenRouter returned an empty choices array")
        }

        const message = choice.message;

        // Base case: Model has finished executing tools and provided a final textual answer
        if (choice.finish_reason !== "tool_calls" || !message.tool_calls) {
            return message.content ?? "(no content returned)";
        }

        // Push the assistant turn verbatim back into history (required by OpenAI protocol)
        messages.push(message)

        // Process all requested tool calls in parallel/sequence
        for (const toolCall of message.tool_calls) {
            let fnName: string;
            let resultText: string;

            if (toolCall.type !== "function") {
                // Custom tool call 
                fnName = toolCall.custom.name;
                resultText = `Error: Tool "${fnName}" is a custom tool; this agent only supports function tools.`;
            } else {
                fnName = toolCall.function.name;
                const fn = toolFunctions[fnName];
                
                if (!fn) {
                    resultText = `Error: Tool "${fnName}" is not registered in registry`;
                } else {
                    try {
                        const rawArgs = JSON.parse(toolCall.function.arguments || "{}");
                        resultText = await fn(rawArgs);
                    } catch (error) {
                        // Catch JSON parse errors or Zod validation errors and pass readable feedback to LLM
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        resultText = `Error running ${fnName}: ${errorMsg}`;
                    }
                }
                
                console.log(`[Agent Loop] Tool Execution: ${fnName} -> ${resultText.slice(0, 120)}...`);
                
                // Append tool result message referencing original tool_call_id
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: resultText,
                });
            }
        }
    }

    return "Agent reached maximum conversation turn limit without producing a final answer."
}