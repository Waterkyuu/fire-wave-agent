import type { UIMessage } from "ai";

type RenderableMessagePart = Record<string, unknown>;

type ReasoningMessagePart = RenderableMessagePart & {
	type: "reasoning";
	text: string;
	durationSeconds?: number;
};

const isRenderableMessagePart = (part: UIMessage["parts"][number]) =>
	part.type !== "step-start";

const getRenderableMessageParts = (
	message: UIMessage,
): RenderableMessagePart[] =>
	message.parts.filter(
		isRenderableMessagePart,
	) as unknown as RenderableMessagePart[];

const isReasoningMessagePart = (
	part: Record<string, unknown>,
): part is ReasoningMessagePart => part.type === "reasoning";

const getReasoningDurationSeconds = (
	part: Record<string, unknown>,
): number | undefined =>
	typeof part.durationSeconds === "number" ? part.durationSeconds : undefined;

const findLastCompletedReasoningPartIndexWithoutTime = (
	parts: RenderableMessagePart[],
	reasoningThinkingTimesByPartIndex: Record<number, number>,
) => {
	for (let index = parts.length - 1; index >= 0; index -= 1) {
		const part = parts[index];
		if (!part || !isReasoningMessagePart(part)) {
			continue;
		}

		if (
			getReasoningDurationSeconds(part) != null ||
			reasoningThinkingTimesByPartIndex[index] != null
		) {
			continue;
		}

		if (index < parts.length - 1) {
			return index;
		}
	}

	return null;
};

export {
	findLastCompletedReasoningPartIndexWithoutTime,
	getReasoningDurationSeconds,
	getRenderableMessageParts,
	isReasoningMessagePart,
};
export type { RenderableMessagePart, ReasoningMessagePart };
