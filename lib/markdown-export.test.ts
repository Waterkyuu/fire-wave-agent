jest.mock("html2canvas", () => jest.fn());
jest.mock("jspdf", () => ({
	jsPDF: jest.fn(() => ({
		addImage: jest.fn(),
		addPage: jest.fn(),
		internal: {
			pageSize: {
				getHeight: () => 842,
				getWidth: () => 595,
			},
		},
		save: jest.fn(),
	})),
}));

import {
	type PdfDocument,
	addCanvasToPdf,
	createMarkdownBlob,
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

	it("adds a rendered markdown canvas to a pdf page", () => {
		const canvas = document.createElement("canvas");
		const drawImage = jest.fn();
		const pdf: PdfDocument = {
			addImage: jest.fn(),
			addPage: jest.fn(),
			internal: {
				pageSize: {
					getHeight: () => 200,
					getWidth: () => 100,
				},
			},
			save: jest.fn(),
		};
		const getContextSpy = jest
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
		const toDataURLSpy = jest
			.spyOn(HTMLCanvasElement.prototype, "toDataURL")
			.mockReturnValue("data:image/png;base64,page");

		canvas.width = 100;
		canvas.height = 300;

		addCanvasToPdf(canvas, pdf);

		expect(pdf.addImage).toHaveBeenCalledTimes(2);
		expect(pdf.addPage).toHaveBeenCalledTimes(1);
		expect(pdf.addImage).toHaveBeenNthCalledWith(
			1,
			"data:image/png;base64,page",
			"PNG",
			0,
			0,
			100,
			200,
		);

		getContextSpy.mockRestore();
		toDataURLSpy.mockRestore();
	});

	it("renders the styled markdown element to canvas and saves the pdf directly", async () => {
		const sourceElement = document.createElement("article");
		const canvas = document.createElement("canvas");
		const drawImage = jest.fn();
		const canvasRenderer = jest.fn(async () => canvas);
		const pdf: PdfDocument = {
			addImage: jest.fn(),
			addPage: jest.fn(),
			internal: {
				pageSize: {
					getHeight: () => 842,
					getWidth: () => 595,
				},
			},
			save: jest.fn(),
		};
		const openSpy = jest.spyOn(window, "open").mockReturnValue(null);
		const getContextSpy = jest
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
		const toDataURLSpy = jest
			.spyOn(HTMLCanvasElement.prototype, "toDataURL")
			.mockReturnValue("data:image/png;base64,markdown");

		sourceElement.innerHTML = "<h1>Report</h1><p>Ready</p>";
		Object.defineProperty(sourceElement, "scrollHeight", {
			configurable: true,
			value: 720,
		});
		Object.defineProperty(sourceElement, "scrollWidth", {
			configurable: true,
			value: 560,
		});
		canvas.width = 560;
		canvas.height = 720;

		const filename = await exportMarkdownPdf({
			canvasRenderer,
			filename: "analysis-report",
			pdfFactory: () => pdf,
			sourceElement,
		});

		expect(filename).toBe("analysis-report.pdf");
		expect(canvasRenderer).toHaveBeenCalledWith(sourceElement, {
			backgroundColor: "#ffffff",
			scale: 2,
			useCORS: true,
			windowHeight: 720,
			windowWidth: 560,
		});
		expect(openSpy).not.toHaveBeenCalled();
		expect(pdf.addImage).toHaveBeenCalledWith(
			"data:image/png;base64,markdown",
			"PNG",
			0,
			0,
			595,
			expect.any(Number),
		);
		expect(pdf.save).toHaveBeenCalledWith("analysis-report.pdf");

		openSpy.mockRestore();
		getContextSpy.mockRestore();
		toDataURLSpy.mockRestore();
	});
});
