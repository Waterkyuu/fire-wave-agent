import {
	createDesktopSandbox,
	executeCode,
	executeCommand,
	navigateBrowser,
	searchWeb,
} from "@/lib/e2b";
import { readFileRecord } from "@/lib/file-store";
import {
	type UIMessage,
	convertToModelMessages,
	stepCountIs,
	streamText,
	tool,
	zodSchema,
} from "ai";
import { NextResponse } from "next/server";
import { zhipu } from "zhipu-ai-provider";
import { z } from "zod";

const createSandboxTool = tool({
	description:
		"Create an E2B Desktop Sandbox with a full Ubuntu desktop and browser. Returns a VNC URL for viewing the remote desktop. Use this when the user needs browser automation or visual desktop interaction.",
	inputSchema: zodSchema(
		z.object({
			task: z
				.string()
				.describe("Description of what the agent needs to do in the sandbox"),
		}),
	),
	execute: async ({ task }: { task: string }) => {
		try {
			const { sandboxId, vncUrl } = await createDesktopSandbox();

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

const shellTool = tool({
	description:
		"Execute a shell command in the desktop sandbox. IMPORTANT: You MUST call createSandbox before using this tool, otherwise it will fail.",
	inputSchema: zodSchema(
		z.object({
			command: z.string().describe("Shell command to execute in the sandbox"),
		}),
	),
	execute: async ({ command }: { command: string }) => {
		try {
			const result = await executeCommand(command);

			return {
				status: "success",
				stdout: result.stdout,
				stderr: result.stderr,
				exitCode: result.exitCode,
			};
		} catch (error) {
			return {
				status: "error",
				message:
					error instanceof Error ? error.message : "Command execution failed",
			};
		}
	},
});

const navigateBrowserTool = tool({
	description:
		"Open a URL in the desktop sandbox browser. IMPORTANT: You MUST call createSandbox before using this tool, otherwise it will fail.",
	inputSchema: zodSchema(
		z.object({
			url: z.string().describe("URL to navigate to"),
		}),
	),
	execute: async ({ url }: { url: string }) => {
		try {
			const result = await navigateBrowser(url);

			return {
				status: "success",
				url: result.url,
				message: result.title,
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
	description:
		"Search the web by opening Google in the desktop sandbox browser. IMPORTANT: You MUST call createSandbox before using this tool, otherwise it will fail.",
	inputSchema: zodSchema(
		z.object({
			query: z.string().describe("Search query"),
		}),
	),
	execute: async ({ query }: { query: string }) => {
		try {
			const result = await searchWeb(query);

			return {
				status: "success",
				query: result.query,
				results: result.results,
			};
		} catch (error) {
			return {
				status: "error",
				message: error instanceof Error ? error.message : "Search failed",
			};
		}
	},
});

const SYSTEM_PROMPT = `You are an autonomous AI agent that helps users accomplish tasks using sandbox environments. You have access to two types of sandboxes:

1. **Desktop Sandbox** (Ubuntu desktop + browser + VNC) — for browser automation, visual tasks, web browsing
2. **Code Interpreter** (Jupyter notebook) — for Python execution, data analysis, calculations, chart generation

IMPORTANT RULES:
- Before using navigateBrowser, searchWeb, or executeShell, you MUST call createSandbox first to set up a desktop sandbox.
- For Python/code tasks, use codeInterpreter directly — it auto-creates a Jupyter sandbox if needed.
- Break complex tasks into steps and use the appropriate tool for each step.
- Report your progress to the user.

Always explain what you're doing and why. Be thorough and careful.`;

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const {
			fileIds = [],
			messages: uiMessages,
		}: { fileIds?: string[]; messages: Array<Omit<UIMessage, "id">> } = body;

		const attachedFiles = await Promise.all(
			fileIds.map(async (fileId) => {
				try {
					return await readFileRecord(fileId);
				} catch {
					return null;
				}
			}),
		);

		const modelMessages = await convertToModelMessages(uiMessages);

		const modelName = process.env.GLM_MODEL ?? "glm-4-flash";
		const attachmentContext = attachedFiles
			.filter(
				(file): file is Awaited<ReturnType<typeof readFileRecord>> =>
					file !== null,
			)
			.map(
				(file) =>
					`- ${file.filename} -> ${file.kind ?? "document"} -> ${file.objectKey ?? "unresolved"}`,
			)
			.join("\n");

		const codeInterpreterTool = tool({
			description:
				"Execute Python code in an isolated Jupyter notebook sandbox. Use for data analysis, calculations, chart generation, and any Python computation. Each call runs in a notebook cell, so variables persist between calls.",
			inputSchema: zodSchema(
				z.object({
					code: z
						.string()
						.describe("Python code to execute in a notebook cell"),
				}),
			),
			execute: async ({ code }: { code: string }) => {
				try {
					const result = await executeCode(code, undefined, fileIds);

					return {
						status: result.error ? "error" : "success",
						text: result.text,
						results: result.results,
						stdout: result.stdout,
						stderr: result.stderr,
						error: result.error,
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

		const result = streamText({
			model: zhipu(modelName),
			system: `${SYSTEM_PROMPT}

ATTACHED FILES:
${attachmentContext || "- none"}

If attached files exist, they will be synced into the code interpreter at ${"/home/user/data"} before Python runs.
Use pandas to load them from that folder when the user asks for analysis, charting, or cleaning.`,
			messages: modelMessages,
			tools: {
				createSandbox: createSandboxTool,
				codeInterpreter: codeInterpreterTool,
				executeShell: shellTool,
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
