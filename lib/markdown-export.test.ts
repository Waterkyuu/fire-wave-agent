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
					getHeight: () => 172,
					getWidth: () => 172,
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

		expect(pdf.addImage).toHaveBeenCalledTimes(3);
		expect(pdf.addPage).toHaveBeenCalledTimes(2);
		expect(pdf.addImage).toHaveBeenNthCalledWith(
			1,
			"data:image/png;base64,page",
			"PNG",
			36,
			36,
			100,
			100,
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
		expect(canvasRenderer).toHaveBeenCalledWith(expect.any(HTMLElement), {
			backgroundColor: "#ffffff",
			scale: 2,
			useCORS: true,
			windowHeight: expect.any(Number),
			windowWidth: 698,
		});
		expect(canvasRenderer.mock.calls[0]?.[0]).not.toBe(sourceElement);
		expect(canvasRenderer.mock.calls[0]?.[0].style.width).toBe(
			"697.3333333333333px",
		);
		expect(openSpy).not.toHaveBeenCalled();
		expect(pdf.addImage).toHaveBeenCalledWith(
			"data:image/png;base64,markdown",
			"PNG",
			36,
			36,
			523,
			expect.any(Number),
		);
		expect(pdf.save).toHaveBeenCalledWith("analysis-report.pdf");

		openSpy.mockRestore();
		getContextSpy.mockRestore();
		toDataURLSpy.mockRestore();
	});

	it("prepares a pdf-only A4 clone with embedded URL images and safe colors", async () => {
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
		const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({
			blob: async () => new Blob(["image"], { type: "image/png" }),
			ok: true,
		} as Response);
		const getContextSpy = jest
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
		const toDataURLSpy = jest
			.spyOn(HTMLCanvasElement.prototype, "toDataURL")
			.mockReturnValue("data:image/png;base64,markdown");

		sourceElement.className = "prose prose-sm dark:prose-invert markdown-body";
		sourceElement.innerHTML = `
			<h1 style="color: lab(29.2345% 39.3825 20.0664)">Report</h1>
			<img src="https://assets.example.test/chart.png" alt="Chart" />
		`;
		canvas.width = 1394;
		canvas.height = 1000;

		await exportMarkdownPdf({
			canvasRenderer,
			pdfFactory: () => pdf,
			sourceElement,
		});

		const exportElement = canvasRenderer.mock.calls[0]?.[0];
		const exportImage = exportElement?.querySelector("img");
		const exportHeading = exportElement?.querySelector("h1");

		expect(fetchSpy).toHaveBeenCalledWith(
			"https://assets.example.test/chart.png",
			{ credentials: "omit", mode: "cors" },
		);
		expect(exportElement?.className).toBe("markdown-body");
		expect(exportImage?.getAttribute("src")).toMatch(
			/^data:image\/png;base64,/,
		);
		expect(exportImage?.getAttribute("srcset")).toBeNull();
		expect(exportHeading?.getAttribute("style") ?? "").not.toContain("lab(");

		fetchSpy.mockRestore();
		getContextSpy.mockRestore();
		toDataURLSpy.mockRestore();
	});
});
