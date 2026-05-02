import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const MARKDOWN_EXPORT_BASENAME = "refract-markdown";
const MARKDOWN_MIME_TYPE = "text/markdown;charset=utf-8";
const PDF_PAGE_MARGIN = 0;
const PDF_RENDER_SCALE = 2;

type FileExtension = "md" | "pdf";

type DownloadBlobOptions = {
	document?: Document;
	url?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
};

type MarkdownFileExportOptions = DownloadBlobOptions & {
	filename?: string;
};

type CanvasRenderOptions = {
	backgroundColor: string;
	scale: number;
	useCORS: boolean;
	windowHeight: number;
	windowWidth: number;
};

type CanvasRenderer = (
	sourceElement: HTMLElement,
	options: CanvasRenderOptions,
) => Promise<HTMLCanvasElement>;

type PdfDocument = {
	addImage: (
		imageData: string,
		format: "PNG",
		x: number,
		y: number,
		width: number,
		height: number,
	) => void;
	addPage: () => void;
	internal: {
		pageSize: {
			getHeight: () => number;
			getWidth: () => number;
		};
	};
	save: (filename: string) => void;
};

type MarkdownPdfExportOptions = {
	canvasRenderer?: CanvasRenderer;
	filename?: string;
	pdfFactory?: () => PdfDocument;
	sourceElement: HTMLElement;
};

const withFileExtension = (filename: string, extension: FileExtension) => {
	const cleanFilename = filename.trim() || MARKDOWN_EXPORT_BASENAME;
	const normalizedExtension = extension.replace(/^\./, "");
	const filenameWithoutExtension = cleanFilename.replace(/\.[^/.]+$/, "");

	return `${filenameWithoutExtension}.${normalizedExtension}`;
};

const createMarkdownBlob = (content: string) =>
	new Blob([content], { type: MARKDOWN_MIME_TYPE });

const downloadBlob = (
	blob: Blob,
	filename: string,
	options: DownloadBlobOptions = {},
) => {
	const targetDocument = options.document ?? document;
	const urlApi = options.url ?? URL;
	const objectUrl = urlApi.createObjectURL(blob);
	const link = targetDocument.createElement("a");

	link.href = objectUrl;
	link.download = filename;
	link.rel = "noopener";

	targetDocument.body.append(link);
	link.click();
	link.remove();
	urlApi.revokeObjectURL(objectUrl);
};

const exportMarkdownFile = (
	content: string,
	options: MarkdownFileExportOptions = {},
) => {
	const filename = withFileExtension(
		options.filename ?? MARKDOWN_EXPORT_BASENAME,
		"md",
	);
	const blob = createMarkdownBlob(content);

	downloadBlob(blob, filename, options);

	return filename;
};

const createPdfDocument = (): PdfDocument =>
	new jsPDF({
		format: "a4",
		orientation: "portrait",
		unit: "pt",
	}) as PdfDocument;

const renderElementToCanvas: CanvasRenderer = (sourceElement, options) =>
	html2canvas(sourceElement, options);

const hasExportableContent = (sourceElement: HTMLElement) => {
	const visibleText =
		"innerText" in sourceElement && typeof sourceElement.innerText === "string"
			? sourceElement.innerText
			: (sourceElement.textContent ?? "");

	return Boolean(visibleText.trim() || sourceElement.innerHTML.trim());
};

const getCanvasWindowSize = (sourceElement: HTMLElement) => {
	const windowWidth =
		sourceElement.scrollWidth ||
		sourceElement.clientWidth ||
		sourceElement.offsetWidth;
	const windowHeight =
		sourceElement.scrollHeight ||
		sourceElement.clientHeight ||
		sourceElement.offsetHeight;

	return {
		windowHeight,
		windowWidth,
	};
};

const createCanvasSlice = (
	sourceCanvas: HTMLCanvasElement,
	offsetY: number,
	sliceHeight: number,
) => {
	const ownerDocument = sourceCanvas.ownerDocument ?? document;
	const sliceCanvas = ownerDocument.createElement("canvas");
	const context = sliceCanvas.getContext("2d");

	sliceCanvas.width = sourceCanvas.width;
	sliceCanvas.height = sliceHeight;

	if (!context) {
		throw new Error("Unable to create PDF canvas context");
	}

	context.drawImage(
		sourceCanvas,
		0,
		offsetY,
		sourceCanvas.width,
		sliceHeight,
		0,
		0,
		sourceCanvas.width,
		sliceHeight,
	);

	return sliceCanvas;
};

const addCanvasToPdf = (canvas: HTMLCanvasElement, pdf: PdfDocument) => {
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const printableWidth = pageWidth - PDF_PAGE_MARGIN * 2;
	const printableHeight = pageHeight - PDF_PAGE_MARGIN * 2;
	const pageCanvasHeight = Math.floor(
		(printableHeight * canvas.width) / printableWidth,
	);

	for (let offsetY = 0; offsetY < canvas.height; offsetY += pageCanvasHeight) {
		if (offsetY > 0) {
			pdf.addPage();
		}

		const sliceHeight = Math.min(pageCanvasHeight, canvas.height - offsetY);
		const pageCanvas = createCanvasSlice(canvas, offsetY, sliceHeight);
		const pageImageHeight = (sliceHeight * printableWidth) / canvas.width;

		pdf.addImage(
			pageCanvas.toDataURL("image/png"),
			"PNG",
			PDF_PAGE_MARGIN,
			PDF_PAGE_MARGIN,
			printableWidth,
			pageImageHeight,
		);
	}
};

const exportMarkdownPdf = async ({
	canvasRenderer = renderElementToCanvas,
	filename = MARKDOWN_EXPORT_BASENAME,
	pdfFactory = createPdfDocument,
	sourceElement,
}: MarkdownPdfExportOptions) => {
	if (!hasExportableContent(sourceElement)) {
		return false;
	}

	const normalizedFilename = withFileExtension(filename, "pdf");
	const { windowHeight, windowWidth } = getCanvasWindowSize(sourceElement);
	const canvas = await canvasRenderer(sourceElement, {
		backgroundColor: "#ffffff",
		scale: PDF_RENDER_SCALE,
		useCORS: true,
		windowHeight,
		windowWidth,
	});
	const pdf = pdfFactory();

	addCanvasToPdf(canvas, pdf);
	pdf.save(normalizedFilename);

	return normalizedFilename;
};

export {
	addCanvasToPdf,
	createMarkdownBlob,
	exportMarkdownFile,
	exportMarkdownPdf,
	withFileExtension,
};
export type {
	CanvasRenderer,
	MarkdownFileExportOptions,
	MarkdownPdfExportOptions,
	PdfDocument,
};
