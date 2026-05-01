import {
	buildMarkdownPrintHtml,
	createMarkdownBlob,
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

	it("builds a print html document with escaped title and rendered body", () => {
		const html = buildMarkdownPrintHtml({
			bodyHtml: "<h1>Report</h1><p>Ready</p>",
			headMarkup: '<link rel="stylesheet" href="/styles.css">',
			title: 'Report <script>alert("x")</script>',
		});

		expect(html).toContain(
			"<title>Report &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</title>",
		);
		expect(html).toContain('<link rel="stylesheet" href="/styles.css">');
		expect(html).toContain('<main class="markdown-print-body">');
		expect(html).toContain("<h1>Report</h1><p>Ready</p>");
	});
});
