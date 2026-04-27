import {
	TYPST_REPAIR_AGENT_PROMPT,
	buildTypstRepairPrompt,
} from "./typst-repair-agent";

describe("typst repair agent", () => {
	it("requires preserving original report content", () => {
		expect(TYPST_REPAIR_AGENT_PROMPT).toContain(
			"preserving the original report content",
		);
		expect(TYPST_REPAIR_AGENT_PROMPT).toContain("Do not remove sections");
		expect(TYPST_REPAIR_AGENT_PROMPT).toContain("```typst");
	});

	it("builds a repair prompt with content, diagnostics, and learned rules", () => {
		const prompt = buildTypstRepairPrompt({
			attempt: 2,
			content: "= Broken",
			diagnostics: "unclosed delimiter",
			learnedTypstPrompt: "## Learned typst corrections",
		});

		expect(prompt).toContain("## Repair Attempt\n2");
		expect(prompt).toContain("= Broken");
		expect(prompt).toContain("unclosed delimiter");
		expect(prompt).toContain("## Learned typst corrections");
	});
});
