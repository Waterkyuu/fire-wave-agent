jest.mock("./pdf-renderer", () => ({
	createMarkdownPrintHtml: jest.fn(async () => "<html></html>"),
}));

import { renderMarkdownPdf } from "./pdf-service";

describe("renderMarkdownPdf", () => {
	it("renders markdown HTML through a browser page and returns pdf bytes", async () => {
		const setContent = jest.fn();
		const emulateMediaType = jest.fn();
		const evaluate = jest.fn(async () => undefined);
		const waitForFunction = jest.fn();
		const pdf = jest.fn(async () => new Uint8Array([1, 2, 3]));
		const closePage = jest.fn();
		const newPage = jest.fn(async () => ({
			close: closePage,
			emulateMediaType,
			evaluate,
			pdf,
			setContent,
			waitForFunction,
		}));
		const closeBrowser = jest.fn();
		const launchBrowser = jest.fn(async () => ({
			close: closeBrowser,
			newPage,
		}));
		const createHtml = jest.fn(
			() => "<html><body><h1>Report</h1></body></html>",
		);

		const result = await renderMarkdownPdf(
			{
				filename: "analysis-report",
				markdownContent: "# Report",
			},
			{
				createHtml,
				launchBrowser,
			},
		);

		expect(createHtml).toHaveBeenCalledWith({
			markdownContent: "# Report",
		});
		expect(setContent).toHaveBeenCalledWith(
			"<html><body><h1>Report</h1></body></html>",
			expect.objectContaining({
				waitUntil: "networkidle0",
			}),
		);
		expect(emulateMediaType).toHaveBeenCalledWith("screen");
		expect(waitForFunction).toHaveBeenCalled();
		expect(evaluate).toHaveBeenCalled();
		expect(pdf).toHaveBeenCalledWith(
			expect.objectContaining({
				format: "A4",
				printBackground: true,
			}),
		);
		expect(result.filename).toBe("analysis-report.pdf");
		expect(Array.from(result.bytes)).toEqual([1, 2, 3]);
		expect(closePage).toHaveBeenCalled();
		expect(closeBrowser).toHaveBeenCalled();
	});
});
