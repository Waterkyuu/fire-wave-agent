import {
	createMarkdownBlob,
	exportMarkdownFile,
	exportMarkdownPdf,
	withFileExtension,
} from "./markdown-export";

const readBlobText = (blob: Blob) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();

		reader.addEventListener("load", () => {
			resolve(String(reader.result));
		});
		reader.addEventListener("error", () => {
			reject(reader.error);
		});
		reader.readAsText(blob);
	});

describe("markdown export helpers", () => {
	it("adds the requested extension when filename has no extension", () => {
		expect(withFileExtension("analysis-report", "md")).toBe(
			"analysis-report.md",
		);
	});

	it("replaces a different extension with the requested extension", () => {
		expect(withFileExtension("analysis-report.pdf", "md")).toBe(
			"analysis-report.md",
		);
	});

	it("creates a markdown blob with utf-8 content type", async () => {
		const blob = createMarkdownBlob("# Report\n\nHello");

		expect(blob.type).toBe("text/markdown;charset=utf-8");
		await expect(readBlobText(blob)).resolves.toBe("# Report\n\nHello");
	});

	it("downloads the raw markdown file", () => {
		const createObjectURL = jest.fn(() => "blob:markdown");
		const revokeObjectURL = jest.fn();
		const originalCreateElement = document.createElement.bind(document);
		const anchor = document.createElement("a");
		const clickSpy = jest.spyOn(anchor, "click").mockImplementation(() => {});
		const createElementSpy = jest
			.spyOn(document, "createElement")
			.mockImplementation(((tagName: string) =>
				tagName === "a"
					? anchor
					: originalCreateElement(tagName)) as typeof document.createElement);

		const filename = exportMarkdownFile("# Report", {
			document,
			filename: "analysis-report",
			url: {
				createObjectURL,
				revokeObjectURL,
			},
		});

		expect(filename).toBe("analysis-report.md");
		expect(createObjectURL).toHaveBeenCalled();
		expect(anchor.download).toBe("analysis-report.md");
		expect(clickSpy).toHaveBeenCalled();
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:markdown");

		createElementSpy.mockRestore();
		clickSpy.mockRestore();
	});

	it("posts markdown to the export route and downloads the returned pdf", async () => {
		const createObjectURL = jest.fn(() => "blob:pdf");
		const revokeObjectURL = jest.fn();
		const originalCreateElement = document.createElement.bind(document);
		const anchor = document.createElement("a");
		const clickSpy = jest.spyOn(anchor, "click").mockImplementation(() => {});
		const createElementSpy = jest
			.spyOn(document, "createElement")
			.mockImplementation(((tagName: string) =>
				tagName === "a"
					? anchor
					: originalCreateElement(tagName)) as typeof document.createElement);
		const fetcher = jest.fn(async () => ({
			blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
			headers: {
				get: () => null,
			},
			ok: true,
		}));

		const filename = await exportMarkdownPdf({
			document,
			fetcher,
			filename: "analysis-report",
			markdownContent: "# Report",
			url: {
				createObjectURL,
				revokeObjectURL,
			},
		});

		expect(fetcher).toHaveBeenCalledWith(
			"/api/export/markdown/pdf",
			expect.objectContaining({
				body: JSON.stringify({
					filename: "analysis-report",
					markdownContent: "# Report",
				}),
				headers: {
					"Content-Type": "application/json",
				},
				method: "POST",
			}),
		);
		expect(filename).toBe("analysis-report.pdf");
		expect(anchor.download).toBe("analysis-report.pdf");
		expect(clickSpy).toHaveBeenCalled();
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:pdf");

		createElementSpy.mockRestore();
		clickSpy.mockRestore();
	});

	it("throws when the pdf export route fails", async () => {
		const fetcher = jest.fn(async () => ({
			ok: false,
		}));

		await expect(
			exportMarkdownPdf({
				fetcher,
				markdownContent: "# Report",
			}),
		).rejects.toThrow("Failed to export markdown as PDF.");
	});
});
