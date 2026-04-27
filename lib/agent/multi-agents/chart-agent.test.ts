import { CHART_AGENT_PROMPT, createChartAgent } from "./chart-agent";

describe("CHART_AGENT_PROMPT", () => {
	it("requires persistAllCharts after all charts are generated", () => {
		expect(CHART_AGENT_PROMPT).toContain("persistAllCharts");
		expect(CHART_AGENT_PROMPT).toContain("MANDATORY");
	});

	it("instructs that persistAllCharts returns artifacts needed for JSON output", () => {
		expect(CHART_AGENT_PROMPT).toContain(
			"call persistAllCharts ONCE to save them to storage",
		);
		expect(CHART_AGENT_PROMPT).toContain(
			"Without calling it, you will NOT have the fileId",
		);
	});

	it("forbids calling persistAllCharts multiple times", () => {
		expect(CHART_AGENT_PROMPT).toContain("Do NOT call it more than once");
	});

	it("forbids plt.close and plt.savefig so charts render inline", () => {
		expect(CHART_AGENT_PROMPT).toContain("plt.close()");
		expect(CHART_AGENT_PROMPT).toContain("plt.savefig()");
	});

	it("allows subplots only for comparing related data dimensions", () => {
		expect(CHART_AGENT_PROMPT).toContain("ONE figure");
		expect(CHART_AGENT_PROMPT).toContain("Subplots count as ONE chart");
	});

	it("provides correct example codeInterpreter call", () => {
		expect(CHART_AGENT_PROMPT).toContain("plt.figure(");
	});
});

describe("createChartAgent", () => {
	it("sets maxSteps high enough to accommodate retries", () => {
		const agent = createChartAgent({
			fileIds: [],
			sandboxSession: undefined as never,
		});
		expect(agent.maxSteps).toBeGreaterThanOrEqual(15);
	});
});
