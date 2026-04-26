import { REPORT_AGENT_PROMPT } from "./report-agent";

describe("REPORT_AGENT_PROMPT", () => {
	it("requires loadSkill calls for typst-expert and a category skill", () => {
		expect(REPORT_AGENT_PROMPT).toContain('loadSkill("typst-expert")');
		expect(REPORT_AGENT_PROMPT).toContain('loadSkill("report-expert")');
		expect(REPORT_AGENT_PROMPT).toContain('loadSkill("paper-expert")');
		expect(REPORT_AGENT_PROMPT).toContain('loadSkill("resume-expert")');
	});

	it("requires typst code block output without JSON", () => {
		expect(REPORT_AGENT_PROMPT).toContain("```typst");
		expect(REPORT_AGENT_PROMPT).toContain("Do NOT output any JSON");
		expect(REPORT_AGENT_PROMPT).toContain(
			"Do NOT call codeInterpreter or persistCodeFile",
		);
	});
});
