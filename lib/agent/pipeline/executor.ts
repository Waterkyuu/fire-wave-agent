import { createChartAgent } from "@/lib/agent/multi-agents/chart-agent";
import { createDataAgent } from "@/lib/agent/multi-agents/data-agent";
import { runOrchestrator } from "@/lib/agent/multi-agents/orchestrator";
import { createReportAgent } from "@/lib/agent/multi-agents/report-agent";
import {
	buildStepPrompt,
	createInitialContext,
} from "@/lib/agent/pipeline/context";
import type { SandboxSession } from "@/lib/e2b";
import type { FileRecord } from "@/types";
import {
	type AgentDefinition,
	type ChartOutput,
	ChartOutputSchema,
	type DataOutput,
	DataOutputSchema,
	type PersistedArtifact,
	PersistedArtifactSchema,
	type PipelineContext,
	type PipelineStep,
	type PipelineStreamEvent,
	type ReportOutput,
	ReportOutputSchema,
} from "@/types/agent";
import { stepCountIs, streamText } from "ai";
import { zhipu } from "zhipu-ai-provider";
import { z } from "zod";

type ExecutorCallbacks = {
	onEvent: (event: PipelineStreamEvent) => void;
};

type StepToolResult = {
	toolName: string;
	output: unknown;
};

type StepExecutionResult = {
	text: string;
	toolErrors: string[];
	toolResults: StepToolResult[];
};

const MAIN_MODEL = process.env.GLM_MODEL ?? "glm-4.7-flash";
const DEFAULT_CLEANED_DATA_PATH = "/home/user/output/cleaned_data.csv";

const RelaxedDataOutputSchema = DataOutputSchema.omit({
	artifact: true,
}).extend({
	artifact: PersistedArtifactSchema.optional(),
});

const BestEffortDataOutputSchema = z.object({
	filePath: z.string().optional(),
	summary: z.string().optional(),
	stats: z.string().optional(),
	rowCount: z.coerce.number().int().nonnegative().optional(),
	columns: z.array(z.string()).optional(),
	artifact: PersistedArtifactSchema.optional(),
});

const RelaxedChartOutputSchema = ChartOutputSchema.extend({
	artifacts: z.array(PersistedArtifactSchema).optional(),
});

const BestEffortChartOutputSchema = z.object({
	chartCount: z.coerce.number().int().nonnegative().optional(),
	descriptions: z.array(z.string()).optional(),
	artifacts: z.array(PersistedArtifactSchema).optional(),
});

const RelaxedReportOutputSchema = ReportOutputSchema.omit({
	artifact: true,
}).extend({
	artifact: PersistedArtifactSchema.optional(),
});

// Collect balanced JSON objects from noisy model/tool text while ignoring braces inside quoted strings.
const extractJsonCandidates = (text: string): string[] => {
	const candidates: string[] = [];
	let start = -1;
	let depth = 0;
	let inString = false;
	let escaped = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];

		if (!char) {
			continue;
		}

		if (escaped) {
			escaped = false;
			continue;
		}

		if (char === "\\") {
			escaped = true;
			continue;
		}

		if (char === '"') {
			inString = !inString;
			continue;
		}

		if (inString) {
			continue;
		}

		if (char === "{") {
			if (depth === 0) {
				start = index;
			}
			depth += 1;
			continue;
		}

		if (char === "}" && depth > 0) {
			depth -= 1;
			if (depth === 0 && start >= 0) {
				candidates.push(text.slice(start, index + 1));
				start = -1;
			}
		}
	}

	return candidates;
};

const parseStructuredOutput = <T>(
	text: string,
	schema: z.ZodSchema<T>,
): T | undefined => {
	const candidates = extractJsonCandidates(text);

	// Prefer the last valid object because agents can emit scratch JSON before the final payload.
	for (let index = candidates.length - 1; index >= 0; index -= 1) {
		try {
			const parsed = JSON.parse(candidates[index] ?? "");
			const result = schema.safeParse(parsed);
			if (result.success) {
				return result.data;
			}
		} catch {
			// ignore malformed candidates
		}
	}

	return undefined;
};

const parseStructuredOutputFromTexts = <T>(
	texts: string[],
	schema: z.ZodSchema<T>,
): T | undefined => {
	// Probe multiple text sources (assistant text + tool outputs) until one satisfies the schema.
	for (const text of texts) {
		const parsed = parseStructuredOutput(text, schema);
		if (parsed) {
			return parsed;
		}
	}

	return undefined;
};

const extractTextCandidatesFromToolResults = (
	toolResults: StepToolResult[],
): string[] =>
	// Tool outputs are heterogeneous; normalize likely text-bearing fields into one candidate list.
	toolResults.flatMap(({ output }) => {
		if (!output || typeof output !== "object") {
			return [];
		}

		const outputRecord = output as Record<string, unknown>;
		const textCandidates: string[] = [];

		const pushCandidate = (candidate: unknown) => {
			if (typeof candidate === "string" && candidate.trim().length > 0) {
				textCandidates.push(candidate);
				return;
			}

			if (candidate && typeof candidate === "object") {
				try {
					// Structured outputs can still carry JSON content useful for downstream parsing.
					textCandidates.push(JSON.stringify(candidate));
				} catch {
					// ignore non-serializable values
				}
			}
		};

		pushCandidate(outputRecord.text);
		pushCandidate(outputRecord.data);
		pushCandidate(outputRecord.json);
		pushCandidate(outputRecord.markdown);
		pushCandidate(outputRecord.html);

		if (Array.isArray(outputRecord.stdout)) {
			for (const line of outputRecord.stdout) {
				pushCandidate(line);
			}
		}

		if (Array.isArray(outputRecord.stderr)) {
			for (const line of outputRecord.stderr) {
				pushCandidate(line);
			}
		}

		if (Array.isArray(outputRecord.results)) {
			for (const result of outputRecord.results) {
				pushCandidate(result);
			}
		}

		return textCandidates;
	});

const extractLikelyCsvPath = (texts: string[]): string | undefined => {
	const csvPathRegex = /\/home\/user\/output\/[^\s"'`]+\.csv/g;
	const matches = texts.flatMap((text) =>
		Array.from(text.matchAll(csvPathRegex)),
	);
	const lastMatch = matches.at(-1);
	return lastMatch?.[0];
};

const normalizeSummaryText = (text: string): string | undefined => {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (normalized.length === 0) {
		return undefined;
	}

	return normalized.slice(0, 600);
};

const buildFallbackDataStats = (
	rowCount: number,
	columns: string[],
): string => {
	const columnsLabel = columns.length > 0 ? columns.join(", ") : "unknown";
	return `Rows: ${rowCount}. Columns (${columns.length}): ${columnsLabel}.`;
};

const formatToolError = (toolName: string, error: unknown) => {
	if (error instanceof Error) {
		return `${toolName}: ${error.message}`;
	}

	if (typeof error === "string") {
		return `${toolName}: ${error}`;
	}

	try {
		return `${toolName}: ${JSON.stringify(error)}`;
	} catch {
		return `${toolName}: Unknown tool error`;
	}
};

const extractArtifactsFromToolResults = (
	toolResults: StepToolResult[],
	toolName: string,
): PersistedArtifact[] =>
	toolResults.flatMap(({ output, toolName: resultToolName }) => {
		if (resultToolName !== toolName || !output || typeof output !== "object") {
			return [];
		}

		const parsed = PersistedArtifactSchema.safeParse(output);
		return parsed.success ? [parsed.data] : [];
	});

const formatStepFailure = (error: Error, toolErrors: string[]) => {
	if (toolErrors.length === 0) {
		return error.message;
	}

	const uniqueToolErrors = [...new Set(toolErrors)];
	return `${uniqueToolErrors.join("\n\n")}\n\n${error.message}`;
};

const firstDefined = <T>(...candidates: (T | undefined)[]): T =>
	candidates.find((c): c is T => c !== undefined) as T;

const firstNonEmpty = <T>(...candidates: (T[] | undefined)[]): T[] =>
	candidates.find((c): c is T[] => Array.isArray(c) && c.length > 0) ?? [];

/**
 * Resolve a structured DataOutput from the raw result of the "data" pipeline step.
 *
 * Uses a three-tier fallback strategy per field:
 *   1. Strict JSON parsed from LLM text → 2. Best-effort JSON → 3. Raw tool result fallback.
 *
 * @param stepResult - Raw execution result from the data step.
 *   { text: "I cleaned the dataset...", toolErrors: [], toolResults: [{ toolName: "persistCodeFile", result: { artifact: {...} } }] }
 *
 * @returns Validated DataOutput object.
 *   { filePath: "/home/user/output/cleaned_data.csv", summary: "Removed 12 null rows...", stats: "100 rows x 5 cols",
 *     rowCount: 100, columns: ["name","age","city","score","date"], artifact: { kind: "dataset", filename: "cleaned_data.csv", ... } }
 */
const resolveDataOutput = (stepResult: StepExecutionResult): DataOutput => {
	const textCandidates = [
		stepResult.text,
		...extractTextCandidatesFromToolResults(stepResult.toolResults),
	].filter((text) => text.trim().length > 0);

	const parsedOutput = parseStructuredOutputFromTexts(
		textCandidates,
		RelaxedDataOutputSchema,
	);
	const bestEffortOutput = parseStructuredOutputFromTexts(
		textCandidates,
		BestEffortDataOutputSchema,
	);

	const persistedArtifacts = extractArtifactsFromToolResults(
		stepResult.toolResults,
		"persistCodeFile",
	);

	const artifact =
		parsedOutput?.artifact ??
		bestEffortOutput?.artifact ??
		persistedArtifacts.find((c) => c.kind === "dataset") ??
		persistedArtifacts.at(-1);

	if (!artifact) {
		throw new Error("Data step did not persist the cleaned dataset.");
	}

	const columns = firstNonEmpty(
		parsedOutput?.columns,
		bestEffortOutput?.columns,
		artifact.preview?.columns,
		[],
	);
	const rowCount = firstDefined(
		parsedOutput?.rowCount,
		bestEffortOutput?.rowCount,
		artifact.preview?.totalRows,
		0,
	);
	const summary = firstDefined(
		parsedOutput?.summary,
		bestEffortOutput?.summary,
		normalizeSummaryText(stepResult.text),
		`Cleaned dataset persisted as ${artifact.filename}.`,
	);
	const filePath = firstDefined(
		parsedOutput?.filePath,
		bestEffortOutput?.filePath,
		extractLikelyCsvPath(textCandidates),
		DEFAULT_CLEANED_DATA_PATH,
	);
	const stats = firstDefined(
		parsedOutput?.stats,
		bestEffortOutput?.stats,
		buildFallbackDataStats(rowCount, columns),
	);

	return DataOutputSchema.parse({
		filePath,
		summary,
		stats,
		rowCount,
		columns,
		artifact,
	});
};

/**
 * Resolve a structured ChartOutput from the raw result of the "chart" pipeline step.
 *
 * Uses a three-tier fallback strategy per field:
 *   1. Strict JSON parsed from LLM text → 2. Best-effort JSON → 3. Raw tool result fallback.
 *
 * @param stepResult - Raw execution result from the chart step.
 *   { text: "Generated 3 charts...", toolErrors: [], toolResults: [{ toolName: "persistLatestChart", result: { artifact: {...} } }] }
 *
 * @returns Validated ChartOutput object.
 *   { chartCount: 3, descriptions: ["Bar chart of sales by region", "Line chart of trends", "Pie chart of distribution"],
 *     artifacts: [{ kind: "image", filename: "chart_1.png", ... }] }
 */
const resolveChartOutput = (stepResult: StepExecutionResult): ChartOutput => {
	const textCandidates = [
		stepResult.text,
		...extractTextCandidatesFromToolResults(stepResult.toolResults),
	].filter((text) => text.trim().length > 0);

	const parsedOutput = parseStructuredOutputFromTexts(
		textCandidates,
		RelaxedChartOutputSchema,
	);
	const bestEffortOutput = parseStructuredOutputFromTexts(
		textCandidates,
		BestEffortChartOutputSchema,
	);

	const toolArtifacts = extractArtifactsFromToolResults(
		stepResult.toolResults,
		"persistLatestChart",
	);
	const outputArtifacts =
		toolArtifacts.length > 0
			? toolArtifacts
			: (parsedOutput?.artifacts ?? bestEffortOutput?.artifacts);

	const fallbackDescription =
		stepResult.toolErrors.length > 0
			? `Chart generation encountered tool errors: ${stepResult.toolErrors.join(" | ")}`
			: firstDefined(
					normalizeSummaryText(stepResult.text),
					"Chart generation did not complete successfully in this run.",
				);
	const descriptions = firstNonEmpty(
		parsedOutput?.descriptions,
		bestEffortOutput?.descriptions,
		[fallbackDescription],
	);
	const chartCount = firstDefined(
		parsedOutput?.chartCount,
		bestEffortOutput?.chartCount,
		outputArtifacts?.length,
		0,
	);

	return ChartOutputSchema.parse({
		chartCount,
		descriptions,
		artifacts: outputArtifacts,
	});
};

const resolveReportOutput = (stepResult: StepExecutionResult): ReportOutput => {
	const parsedOutput = parseStructuredOutput(
		stepResult.text,
		RelaxedReportOutputSchema,
	);
	const artifact =
		parsedOutput?.artifact ??
		extractArtifactsFromToolResults(
			stepResult.toolResults,
			"persistCodeFile",
		).find((candidate) => candidate.kind === "document") ??
		extractArtifactsFromToolResults(
			stepResult.toolResults,
			"persistCodeFile",
		).at(-1);

	if (!parsedOutput) {
		throw new Error("Report step did not produce a valid JSON summary.");
	}

	if (!artifact) {
		throw new Error("Report step did not persist the generated document.");
	}

	return ReportOutputSchema.parse({
		...parsedOutput,
		artifact,
	});
};

const executeStep = async (
	agent: AgentDefinition,
	stepPrompt: string,
	onDelta: (content: string) => void,
): Promise<StepExecutionResult> => {
	// Execute a single specialist agent with bounded tool-loop steps to avoid runaway calls.
	const result = await streamText({
		system: agent.systemPrompt,
		model: zhipu(MAIN_MODEL),
		messages: [{ role: "user", content: stepPrompt }],
		tools: agent.tools,
		stopWhen: stepCountIs(agent.maxSteps),
	});

	let fullText = "";
	const toolErrors: string[] = [];
	const toolResults: StepToolResult[] = [];

	// Stream parts arrive interleaved (text/tool events), so we aggregate them into one deterministic step result.
	for await (const part of result.fullStream) {
		switch (part.type) {
			case "text-delta":
				fullText += part.text;
				// Forward incremental text so the caller can stream step progress in real time.
				onDelta(part.text);
				break;
			case "tool-result":
				// Keep raw tool payloads; downstream resolvers can recover structured output from them.
				toolResults.push({
					toolName: part.toolName,
					output: part.output,
				});
				break;
			case "tool-error":
				// Record tool errors without aborting immediately; the step can still produce usable output.
				toolErrors.push(formatToolError(part.toolName, part.error));
				break;
		}
	}

	return {
		text: fullText,
		toolErrors,
		toolResults,
	};
};

const executePipeline = async (
	userRequest: string,
	attachedFiles: FileRecord[],
	fileIds: string[],
	sandboxSession: SandboxSession,
	callbacks: ExecutorCallbacks,
): Promise<PipelineContext> => {
	const { onEvent } = callbacks;

	// Orchestrator decides which stages to run and in what order for this specific request.
	const pipelinePlan = await runOrchestrator(userRequest, attachedFiles);
	onEvent({ type: "plan", plan: pipelinePlan });

	if (pipelinePlan.steps.length === 0) {
		onEvent({ type: "pipeline-complete" });
		return createInitialContext(userRequest, attachedFiles, pipelinePlan);
	}

	const agentMap: Record<PipelineStep, AgentDefinition> = {
		data: createDataAgent({ fileIds, sandboxSession }),
		chart: createChartAgent({ fileIds, sandboxSession }),
		report: createReportAgent(sandboxSession),
	};

	// Context is a mutable baton passed stage-by-stage; each step enriches it for subsequent prompts.
	const ctx = createInitialContext(userRequest, attachedFiles, pipelinePlan);

	for (const step of pipelinePlan.steps) {
		const agent = agentMap[step];
		let stepResult: StepExecutionResult | undefined;
		onEvent({ type: "step-start", step });

		try {
			// Build prompt from the latest context so each stage sees upstream validated outputs.
			const stepPrompt = buildStepPrompt(step, ctx);
			stepResult = await executeStep(agent, stepPrompt, (content: string) =>
				onEvent({ type: "step-delta", step, content }),
			);

			// Resolve and persist typed stage outputs back into the shared pipeline context.
			switch (step) {
				case "data": {
					const output = resolveDataOutput(stepResult);
					ctx.dataOutput = output;
					onEvent({ type: "step-complete", step, output });
					break;
				}
				case "chart": {
					const output = resolveChartOutput(stepResult);
					ctx.chartOutput = output;
					onEvent({ type: "step-complete", step, output });
					break;
				}
				case "report": {
					const output = resolveReportOutput(stepResult);
					ctx.reportOutput = output;
					onEvent({ type: "step-complete", step, output });
					break;
				}
			}
		} catch (error) {
			// Fail fast on the first stage failure to avoid cascading outputs from partial context.
			const message =
				error instanceof Error
					? formatStepFailure(error, stepResult?.toolErrors ?? [])
					: "Unknown error";
			onEvent({ type: "step-error", step, error: message });
			break;
		}
	}

	onEvent({ type: "pipeline-complete" });
	return ctx;
};

export { executePipeline, MAIN_MODEL };
