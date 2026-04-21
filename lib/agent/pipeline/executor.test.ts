import type { SandboxSession } from "@/lib/agent/sandbox/e2b";
import type { FileRecord } from "@/types";
import {
	type StepExecutionResult,
	ensurePersistedChartArtifacts,
} from "./executor";

describe("ensurePersistedChartArtifacts", () => {
	it("auto-persists the latest chart when chart code ran but no chart artifact was persisted", async () => {
		const persistedChartRecord: FileRecord = {
			id: "chart-1",
			filename: "chart.png",
			contentType: "image/png",
			fileSize: 2048,
			status: "ready",
			kind: "document",
			objectKey: "chart-1/chart.png",
			errorMessage: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		const sandboxSession = {
			persistLatestChart: jest.fn(async () => persistedChartRecord),
		} as unknown as SandboxSession;
		const stepResult: StepExecutionResult = {
			text: '{"chartCount":1,"descriptions":["Generated chart"]}',
			toolErrors: [],
			toolResults: [
				{
					toolName: "codeInterpreter",
					output: {
						results: [
							{
								chart: { title: "Revenue trend" },
								png: "base64-chart",
							},
						],
					},
				},
			],
		};

		const result = await ensurePersistedChartArtifacts(
			stepResult,
			sandboxSession,
		);

		expect(sandboxSession.persistLatestChart).toHaveBeenCalledTimes(1);
		expect(result.toolResults).toContainEqual({
			toolName: "persistLatestChart",
			output: {
				contentType: "image/png",
				downloadUrl: "/api/file/chart-1/download",
				fileId: "chart-1",
				fileSize: 2048,
				filename: "chart.png",
				status: "success",
			},
		});
	});
});
