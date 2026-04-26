import type { UIMessage } from "ai";

type CompressibleMessage = Omit<UIMessage, "id"> & {
	id?: string;
};

type ContextCompressionOptions = {
	anchorMessageCount: number;
	maxSummaryItems: number;
	maxSummaryLineCharacters: number;
	maxToolOutputCharacters: number;
	recentMessageCount: number;
	summaryMessageId: string;
	targetCharacterBudget: number;
};

type ContextCompressionStats = {
	compressedCharacterCount: number;
	compressedMessageCount: number;
	omittedBinaryPayloadCount: number;
	originalCharacterCount: number;
	originalMessageCount: number;
	preservedAnchorMessageCount: number;
	preservedRecentMessageCount: number;
	summarizedMessageCount: number;
	summaryInserted: boolean;
	truncatedTextPayloadCount: number;
};

type ContextCompressionResult = {
	messages: CompressibleMessage[];
	stats: ContextCompressionStats;
};

type SanitizedValueResult = {
	omittedBinaryPayloadCount: number;
	truncatedTextPayloadCount: number;
	value: unknown;
};

const DEFAULT_CONTEXT_COMPRESSION_OPTIONS: ContextCompressionOptions = {
	anchorMessageCount: 2,
	maxSummaryItems: 24,
	maxSummaryLineCharacters: 320,
	maxToolOutputCharacters: 360,
	recentMessageCount: 6,
	summaryMessageId: "context-compression-summary",
	targetCharacterBudget: 24_000,
};

const BINARY_PAYLOAD_KEYS = new Set([
	"base64",
	"blob",
	"dataUrl",
	"image",
	"jpeg",
	"jpg",
	"pdf",
	"png",
	"preview",
	"svg",
]);

const truncateText = (text: string, limit: number) => {
	if (text.length <= limit) {
		return text;
	}

	return `${text.slice(0, Math.max(0, limit - 31))}... [truncated ${text.length - limit} chars]`;
};

const countCharacters = (value: unknown) => {
	try {
		return JSON.stringify(value).length;
	} catch {
		return String(value).length;
	}
};

const mergeSanitizationStats = (
	current: SanitizedValueResult,
	next: SanitizedValueResult,
): SanitizedValueResult => ({
	omittedBinaryPayloadCount:
		current.omittedBinaryPayloadCount + next.omittedBinaryPayloadCount,
	truncatedTextPayloadCount:
		current.truncatedTextPayloadCount + next.truncatedTextPayloadCount,
	value: next.value,
});

const sanitizeValue = (
	value: unknown,
	options: ContextCompressionOptions,
	key = "",
): SanitizedValueResult => {
	if (typeof value === "string") {
		if (
			BINARY_PAYLOAD_KEYS.has(key) &&
			value.length > options.maxToolOutputCharacters
		) {
			return {
				omittedBinaryPayloadCount: 1,
				truncatedTextPayloadCount: 0,
				value: "[omitted large binary output]",
			};
		}

		if (value.length > options.maxToolOutputCharacters) {
			return {
				omittedBinaryPayloadCount: 0,
				truncatedTextPayloadCount: 1,
				value: truncateText(value, options.maxToolOutputCharacters),
			};
		}

		return {
			omittedBinaryPayloadCount: 0,
			truncatedTextPayloadCount: 0,
			value,
		};
	}

	if (Array.isArray(value)) {
		const state: SanitizedValueResult = {
			omittedBinaryPayloadCount: 0,
			truncatedTextPayloadCount: 0,
			value: [],
		};
		const sanitizedItems: unknown[] = [];

		for (const item of value) {
			const next = sanitizeValue(item, options, key);
			sanitizedItems.push(next.value);
			const merged = mergeSanitizationStats(state, next);
			state.omittedBinaryPayloadCount = merged.omittedBinaryPayloadCount;
			state.truncatedTextPayloadCount = merged.truncatedTextPayloadCount;
		}

		return {
			...state,
			value: sanitizedItems,
		};
	}

	if (value && typeof value === "object") {
		const sanitizedRecord: Record<string, unknown> = {};
		const state: SanitizedValueResult = {
			omittedBinaryPayloadCount: 0,
			truncatedTextPayloadCount: 0,
			value: sanitizedRecord,
		};

		for (const [recordKey, recordValue] of Object.entries(value)) {
			const next = sanitizeValue(recordValue, options, recordKey);
			sanitizedRecord[recordKey] = next.value;
			const merged = mergeSanitizationStats(state, next);
			state.omittedBinaryPayloadCount = merged.omittedBinaryPayloadCount;
			state.truncatedTextPayloadCount = merged.truncatedTextPayloadCount;
		}

		return state;
	}

	return {
		omittedBinaryPayloadCount: 0,
		truncatedTextPayloadCount: 0,
		value,
	};
};

const sanitizeMessage = (
	message: CompressibleMessage,
	options: ContextCompressionOptions,
): { message: CompressibleMessage; stats: SanitizedValueResult } => {
	const stats: SanitizedValueResult = {
		omittedBinaryPayloadCount: 0,
		truncatedTextPayloadCount: 0,
		value: null,
	};
	const parts = message.parts.map((part) => {
		const result = sanitizeValue(part, options);
		const merged = mergeSanitizationStats(stats, result);
		stats.omittedBinaryPayloadCount = merged.omittedBinaryPayloadCount;
		stats.truncatedTextPayloadCount = merged.truncatedTextPayloadCount;
		return result.value as UIMessage["parts"][number];
	});

	return {
		message: {
			...message,
			parts,
		},
		stats,
	};
};

const sanitizeMessages = (
	messages: CompressibleMessage[],
	options: ContextCompressionOptions,
) => {
	const stats = {
		omittedBinaryPayloadCount: 0,
		truncatedTextPayloadCount: 0,
	};
	const sanitizedMessages = messages.map((message) => {
		const result = sanitizeMessage(message, options);
		stats.omittedBinaryPayloadCount += result.stats.omittedBinaryPayloadCount;
		stats.truncatedTextPayloadCount += result.stats.truncatedTextPayloadCount;
		return result.message;
	});

	return { messages: sanitizedMessages, stats };
};

const getMessageText = (message: CompressibleMessage) =>
	message.parts
		.flatMap((part) => {
			if (part.type === "text") {
				return [part.text];
			}

			if (part.type === "reasoning") {
				return [part.text];
			}

			if (typeof part.type === "string" && part.type.startsWith("tool-")) {
				const toolRecord = part as Record<string, unknown>;
				const toolName = part.type.slice(5);
				const state = String(toolRecord.state ?? "unknown");
				return [`Tool ${toolName} finished with state ${state}.`];
			}

			return [];
		})
		.join("\n")
		.trim();

const formatSummaryLine = (
	message: CompressibleMessage,
	index: number,
	options: ContextCompressionOptions,
) => {
	const role = message.role === "assistant" ? "Assistant" : "User";
	const text = getMessageText(message);
	const fallback = `[${role} message ${index + 1} contained non-text context]`;
	const content = text || fallback;

	return `- ${role}: ${truncateText(content.replace(/\s+/g, " "), options.maxSummaryLineCharacters)}`;
};

const buildSummaryMessage = (
	messages: CompressibleMessage[],
	options: ContextCompressionOptions,
): CompressibleMessage => {
	const summaryLines = messages
		.slice(0, options.maxSummaryItems)
		.map((message, index) => formatSummaryLine(message, index, options));
	const omittedCount = Math.max(0, messages.length - summaryLines.length);
	const omittedLine =
		omittedCount > 0
			? [
					`- ${omittedCount} additional older messages were omitted from this summary.`,
				]
			: [];

	return {
		id: options.summaryMessageId,
		role: "assistant",
		parts: [
			{
				type: "text",
				text: [
					"## Compressed conversation summary",
					"The following older context was compressed before sending the next model request.",
					...summaryLines,
					...omittedLine,
				].join("\n"),
			},
		],
	};
};

const clampOptions = (
	options?: Partial<ContextCompressionOptions>,
): ContextCompressionOptions => ({
	...DEFAULT_CONTEXT_COMPRESSION_OPTIONS,
	...options,
	anchorMessageCount: Math.max(
		0,
		options?.anchorMessageCount ??
			DEFAULT_CONTEXT_COMPRESSION_OPTIONS.anchorMessageCount,
	),
	maxSummaryItems: Math.max(
		1,
		options?.maxSummaryItems ??
			DEFAULT_CONTEXT_COMPRESSION_OPTIONS.maxSummaryItems,
	),
	maxSummaryLineCharacters: Math.max(
		80,
		options?.maxSummaryLineCharacters ??
			DEFAULT_CONTEXT_COMPRESSION_OPTIONS.maxSummaryLineCharacters,
	),
	maxToolOutputCharacters: Math.max(
		120,
		options?.maxToolOutputCharacters ??
			DEFAULT_CONTEXT_COMPRESSION_OPTIONS.maxToolOutputCharacters,
	),
	recentMessageCount: Math.max(
		1,
		options?.recentMessageCount ??
			DEFAULT_CONTEXT_COMPRESSION_OPTIONS.recentMessageCount,
	),
	targetCharacterBudget: Math.max(
		1,
		options?.targetCharacterBudget ??
			DEFAULT_CONTEXT_COMPRESSION_OPTIONS.targetCharacterBudget,
	),
});

const compressMessages = (
	messages: CompressibleMessage[],
	options?: Partial<ContextCompressionOptions>,
): ContextCompressionResult => {
	const resolvedOptions = clampOptions(options);
	const originalCharacterCount = countCharacters(messages);

	// Claude-style context compression has four practical layers here:
	// 1. preserve anchor messages, 2. trim heavy tool payloads, 3. summarize
	// stale middle turns, 4. restore the recent hot tail exactly.
	const sanitized = sanitizeMessages(messages, resolvedOptions);
	const sanitizedCharacterCount = countCharacters(sanitized.messages);

	if (sanitizedCharacterCount <= resolvedOptions.targetCharacterBudget) {
		return {
			messages: sanitized.messages,
			stats: {
				...sanitized.stats,
				compressedCharacterCount: sanitizedCharacterCount,
				compressedMessageCount: sanitized.messages.length,
				originalCharacterCount,
				originalMessageCount: messages.length,
				preservedAnchorMessageCount: sanitized.messages.length,
				preservedRecentMessageCount: sanitized.messages.length,
				summarizedMessageCount: 0,
				summaryInserted: false,
			},
		};
	}

	// Layer 1 mirrors Claude Code's compaction anchor: keep the opening intent
	// and hard instructions intact so the summary cannot rewrite the task.
	const anchorEnd = Math.min(
		resolvedOptions.anchorMessageCount,
		sanitized.messages.length,
	);
	const anchorMessages = sanitized.messages.slice(0, anchorEnd);

	// Layer 4 mirrors the "recent context restore" step seen in Claude Code
	// writeups: preserve the newest turns verbatim so active work remains precise.
	const recentStart = Math.max(
		anchorEnd,
		sanitized.messages.length - resolvedOptions.recentMessageCount,
	);
	const recentMessages = sanitized.messages.slice(recentStart);

	// Layer 3 is the actual compaction pass: old middle turns become one concise
	// digest. This implementation is deterministic instead of an LLM call so API
	// requests stay cheap and tests remain stable.
	const middleMessages = sanitized.messages.slice(anchorEnd, recentStart);
	const summaryMessages =
		middleMessages.length > 0
			? [buildSummaryMessage(middleMessages, resolvedOptions)]
			: [];
	const compressedMessages = [
		...anchorMessages,
		...summaryMessages,
		...recentMessages,
	];

	// Layer 2 already ran before this point: sanitizeMessages trims large tool
	// results and binary payloads before either preserving or summarizing turns.
	return {
		messages: compressedMessages,
		stats: {
			...sanitized.stats,
			compressedCharacterCount: countCharacters(compressedMessages),
			compressedMessageCount: compressedMessages.length,
			originalCharacterCount,
			originalMessageCount: messages.length,
			preservedAnchorMessageCount: anchorMessages.length,
			preservedRecentMessageCount: recentMessages.length,
			summarizedMessageCount: middleMessages.length,
			summaryInserted: summaryMessages.length > 0,
		},
	};
};

export { DEFAULT_CONTEXT_COMPRESSION_OPTIONS, compressMessages };
export type {
	CompressibleMessage,
	ContextCompressionOptions,
	ContextCompressionResult,
	ContextCompressionStats,
};
