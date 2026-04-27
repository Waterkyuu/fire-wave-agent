import { z } from "zod";

const TYPST_REVIEW_AGENT_PROMPT = `You are a Typst repair reviewer.

Summarize a successful Typst repair into one reusable Typst rule for future report agents.

STRICT RULES:
- Focus on the general syntax or formatting lesson, not the specific report topic.
- Do not include private data, user data, chart values, company names, or report-specific facts.
- Keep the content concise and directly usable as system prompt guidance.
- Output exactly one JSON object and no markdown:
{
  "title": "Short reusable rule title",
  "content": "Concrete Typst guidance with a bad/good pattern if useful."
}`;

const TypstReviewOutputSchema = z.object({
	title: z.string().min(1),
	content: z.string().min(1),
});

type TypstReviewOutput = z.infer<typeof TypstReviewOutputSchema>;

type BuildTypstReviewPromptOptions = {
	originalTypst: string;
	diagnostics: string;
	repairedTypst: string;
};

const buildTypstReviewPrompt = ({
	diagnostics,
	originalTypst,
	repairedTypst,
}: BuildTypstReviewPromptOptions): string => `## Compiler Diagnostics
${diagnostics}

## Failed Typst
\`\`\`typst
${originalTypst}
\`\`\`

## Repaired Typst
\`\`\`typst
${repairedTypst}
\`\`\`

## Review Goal
Write one reusable Typst rule that would help avoid this compile failure in the future.`;

const extractJsonCandidates = (text: string): string[] => {
	const matches = text.match(/\{[\s\S]*\}/g);
	return matches ?? [];
};

const parseTypstReviewOutput = (
	text: string,
): TypstReviewOutput | undefined => {
	const candidates = extractJsonCandidates(text);

	for (let index = candidates.length - 1; index >= 0; index -= 1) {
		try {
			const parsed = JSON.parse(candidates[index] ?? "");
			const result = TypstReviewOutputSchema.safeParse(parsed);
			if (result.success) {
				return result.data;
			}
		} catch {
			// Continue looking for a valid JSON object.
		}
	}

	return undefined;
};

export {
	TYPST_REVIEW_AGENT_PROMPT,
	TypstReviewOutputSchema,
	buildTypstReviewPrompt,
	parseTypstReviewOutput,
};
export type { BuildTypstReviewPromptOptions, TypstReviewOutput };
