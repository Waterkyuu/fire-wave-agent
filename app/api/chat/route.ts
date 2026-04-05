import {
	convertToModelMessages,
	stepCountIs,
	streamText,
	tool,
	zodSchema,
} from "ai";
import { NextResponse } from "next/server";
import { zhipu } from "zhipu-ai-provider";
import { z } from "zod";

const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000;

type SandboxInfo = {
	id: string;
	vncUrl: string;
};

const activeSandboxes = new Map<string, SandboxInfo>();

const createSandboxTool = tool({
	description:
		"Create an E2B Desktop Sandbox for browser automation. Returns a VNC URL for viewing the remote desktop.",
	inputSchema: zodSchema(
		z.object({
			task: z
				.string()
				.describe("Description of what the agent needs to do in the sandbox"),
		}),
	),
	execute: async ({ task }: { task: string }) => {
		try {
			const sandboxId = `sb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const vncUrl = `https://8080-${sandboxId}.e2b.dev`;

			activeSandboxes.set(sandboxId, { id: sandboxId, vncUrl });

			setTimeout(() => {
				activeSandboxes.delete(sandboxId);
			}, SANDBOX_TIMEOUT_MS);

			return {
				sandboxId,
				vncUrl,
				status: "running",
				message: `Sandbox created for task: ${task}`,
			};
		} catch (error) {
			return {
				status: "error",
				message:
					error instanceof Error ? error.message : "Failed to create sandbox",
			};
		}
	},
});

const executeCodeTool = tool({
	description:
		"Execute Python/Playwright code in the sandbox to perform browser automation.",
	inputSchema: zodSchema(
		z.object({
			code: z.string().describe("Python code to execute in the sandbox"),
			sandboxId: z
				.string()
				.optional()
				.describe("Sandbox ID (uses latest if not provided)"),
		}),
	),
	execute: async ({
		code,
		sandboxId,
	}: {
		code: string;
		sandboxId?: string;
	}) => {
		try {
			const sid =
				sandboxId ??
				(activeSandboxes.size > 0
					? [...activeSandboxes.keys()].pop()
					: undefined);

			if (!sid) {
				return {
					status: "error",
					message: "No sandbox available. Create a sandbox first.",
				};
			}

			return {
				status: "success",
				stdout: `Simulated execution of:\n${code.slice(0, 200)}...`,
				stderr: "",
				exitCode: 0,
			};
		} catch (error) {
			return {
				status: "error",
				message:
					error instanceof Error ? error.message : "Code execution failed",
			};
		}
	},
});

const navigateBrowserTool = tool({
	description: "Navigate the browser in the sandbox to a specific URL.",
	inputSchema: zodSchema(
		z.object({
			url: z.string().describe("URL to navigate to"),
		}),
	),
	execute: async ({ url }: { url: string }) => {
		try {
			const sid =
				activeSandboxes.size > 0
					? [...activeSandboxes.keys()].pop()
					: undefined;

			if (!sid) {
				return {
					status: "error",
					message: "No sandbox available. Create a sandbox first.",
				};
			}

			return {
				status: "success",
				url,
				message: `Navigated to ${url}`,
			};
		} catch (error) {
			return {
				status: "error",
				message: error instanceof Error ? error.message : "Navigation failed",
			};
		}
	},
});

const searchWebTool = tool({
	description: "Search the web using a search engine in the sandbox.",
	inputSchema: zodSchema(
		z.object({
			query: z.string().describe("Search query"),
		}),
	),
	execute: async ({ query }: { query: string }) => {
		try {
			return {
				status: "success",
				query,
				results: [
					{
						title: `Search results for: ${query}`,
						snippet: "Web search results would appear here.",
					},
				],
			};
		} catch (error) {
			return {
				status: "error",
				message: error instanceof Error ? error.message : "Search failed",
			};
		}
	},
});

const SYSTEM_PROMPT = `You are an autonomous AI agent that helps users accomplish tasks using a desktop sandbox environment. You can:

1. Create a sandbox with a browser
2. Navigate websites, click elements, fill forms
3. Search the web for information
4. Execute code to automate browser actions

When a user asks you to do something:
- First, create a sandbox if one doesn't exist
- Then break down the task into steps
- Use the available tools to accomplish each step
- Report your progress to the user

Always explain what you're doing and why. Be thorough and careful.`;

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { messages: uiMessages } = body;

		const modelMessages = await convertToModelMessages(uiMessages);

		const modelName = process.env.GLM_MODLE ?? "glm-4-flash";

		const result = streamText({
			model: zhipu(modelName),
			system: SYSTEM_PROMPT,
			messages: modelMessages,
			tools: {
				createSandbox: createSandboxTool,
				executeCode: executeCodeTool,
				navigateBrowser: navigateBrowserTool,
				searchWeb: searchWebTool,
			},
			stopWhen: stepCountIs(10),
		});

		return result.toUIMessageStreamResponse();
	} catch (error) {
		console.error("[Chat API Error]", error);
		return NextResponse.json(
			{
				code: 500,
				success: false,
				message:
					error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}
