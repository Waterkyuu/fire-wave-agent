import { createReportTools } from "@/lib/agent/tools/report-tools";
import type { AgentDefinition } from "@/types/agent";

const TYPST_REPAIR_AGENT_PROMPT = `You are a Typst repair agent.

Your only job is to fix compilation errors while preserving the original report content and structure.

MANDATORY WORKFLOW:
- You MUST call loadSkill("typst-expert") first.
- Use the compiler diagnostics to make the smallest Typst syntax fix that can compile.

STRICT RULES:
- Do not remove sections to make compilation pass.
- Do not rewrite the report unless needed to fix Typst syntax.
- Preserve all factual claims, numbers, headings, chart descriptions, and conclusions.
- Use Typst syntax, not LaTeX or Markdown.
- Output only one complete Typst source inside a fenced code block:
\`\`\`typst
...fixed full typst content here...
\`\`\``;

type BuildTypstRepairPromptOptions = {
	attempt: number;
	content: string;
	diagnostics: string;
	learnedTypstPrompt?: string;
};

const buildTypstRepairPrompt = ({
	attempt,
	content,
	diagnostics,
	learnedTypstPrompt,
}: BuildTypstRepairPromptOptions): string => {
	const learnedSection = learnedTypstPrompt
		? `\n## Learned Typst Corrections\n${learnedTypstPrompt}\n`
		: "";

	return `## Repair Attempt
${attempt}

## Compiler Diagnostics
${diagnostics}
${learnedSection}
## Original Typst
\`\`\`typst
${content}
\`\`\`

## Repair Goal
Return a complete corrected Typst document.`;
};

const createTypstRepairAgent = (): AgentDefinition => ({
	name: "Typst Repair Agent",
	step: "report",
	systemPrompt: TYPST_REPAIR_AGENT_PROMPT,
	tools: createReportTools(),
	maxSteps: 6,
});

export {
	TYPST_REPAIR_AGENT_PROMPT,
	buildTypstRepairPrompt,
	createTypstRepairAgent,
};
export type { BuildTypstRepairPromptOptions };
