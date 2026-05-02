import { POST } from "./route";

jest.mock("@/lib/markdown-export/pdf-service", () => ({
	renderMarkdownPdf: jest.fn(async () => ({
		bytes: new Uint8Array([1, 2, 3]),
		filename: "analysis-report.pdf",
	})),
}));

describe("POST /api/export/markdown/pdf", () => {
	it("returns 400 when markdownContent is missing", async () => {
		const response = await POST({
			json: async () => ({}),
		} as Request);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual(
			expect.objectContaining({
				message: "Invalid export request",
				success: false,
			}),
		);
	});

	it("returns a pdf attachment when the request is valid", async () => {
		const response = await POST({
			json: async () => ({
				filename: "analysis-report",
				markdownContent: "# Report",
			}),
		} as Request);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/pdf");
		expect(response.headers.get("Content-Disposition")).toContain(
			"analysis-report.pdf",
		);
		expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([
			1, 2, 3,
		]);
	});
});
