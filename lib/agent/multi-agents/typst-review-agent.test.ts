import {
	TYPST_REVIEW_AGENT_PROMPT,
	buildTypstReviewPrompt,
	parseTypstReviewOutput,
} from "./typst-review-agent";

describe("typst review agent", () => {
	it("requires a reusable JSON learning summary", () => {
		expect(TYPST_REVIEW_AGENT_PROMPT).toContain("reusable Typst rule");
		expect(TYPST_REVIEW_AGENT_PROMPT).toContain("title");
		expect(TYPST_REVIEW_AGENT_PROMPT).toContain("content");
		expect(TYPST_REVIEW_AGENT_PROMPT).toContain("Do not include private data");
	});

	it("builds a review prompt from failed and repaired Typst", () => {
		const prompt = buildTypstReviewPrompt({
			diagnostics: "unclosed delimiter",
			originalTypst: "= Broken",
			repairedTypst: "= Fixed",
		});

		expect(prompt).toContain("unclosed delimiter");
		expect(prompt).toContain("= Broken");
		expect(prompt).toContain("= Fixed");
	});

	it("parses the final JSON learning summary", () => {
		const parsed = parseTypstReviewOutput(
			'Notes\n{"title":"Inline math spacing","content":"Use `$x^2$` for inline math."}',
		);

		expect(parsed).toEqual({
			title: "Inline math spacing",
			content: "Use `$x^2$` for inline math.",
		});
	});
});
