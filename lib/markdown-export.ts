import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const MARKDOWN_EXPORT_BASENAME = "refract-markdown";
const MARKDOWN_MIME_TYPE = "text/markdown;charset=utf-8";
const PDF_PAGE_MARGIN = 36;
const PDF_RENDER_SCALE = 2;
const CSS_PIXELS_PER_POINT = 96 / 72;
const UNSUPPORTED_COLOR_FUNCTION_PATTERN = /\b(?:lab|lch|oklab|oklch|color)\(/i;

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

type PdfExportLayout = {
	cssPageHeight: number;
	cssWidth: number;
	windowWidth: number;
};

type PreparedExportElement = {
	cleanup: () => void;
	element: HTMLElement;
	layout: PdfExportLayout;
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

const getPdfExportLayout = (pdf: PdfDocument): PdfExportLayout => {
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const printableWidth = pageWidth - PDF_PAGE_MARGIN * 2;
	const cssWidth = printableWidth * CSS_PIXELS_PER_POINT;

	return {
		cssPageHeight: pageHeight * CSS_PIXELS_PER_POINT,
		cssWidth,
		windowWidth: Math.ceil(cssWidth),
	};
};

const getExportCanvasWindowSize = (
	sourceElement: HTMLElement,
	exportElement: HTMLElement,
	layout: PdfExportLayout,
) => {
	const { windowHeight } = getCanvasWindowSize(exportElement);
	const sourceSize = getCanvasWindowSize(sourceElement);

	return {
		windowHeight:
			windowHeight ||
			sourceSize.windowHeight ||
			Math.ceil(layout.cssPageHeight),
		windowWidth: layout.windowWidth,
	};
};

const readBlobAsDataUrl = (blob: Blob) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();

		reader.addEventListener("load", () => {
			resolve(String(reader.result));
		});
		reader.addEventListener("error", () => {
			reject(reader.error);
		});
		reader.readAsDataURL(blob);
	});

const isEmbeddableImageUrl = (src: string) => {
	if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
		return false;
	}

	return true;
};

const embedImageSource = async (image: HTMLImageElement) => {
	const src = image.currentSrc || image.getAttribute("src") || image.src;

	if (!isEmbeddableImageUrl(src) || typeof fetch !== "function") {
		return;
	}

	try {
		const response = await fetch(src, { credentials: "omit", mode: "cors" });

		if (!response.ok) {
			throw new Error(`Image request failed with status ${response.status}`);
		}

		const dataUrl = await readBlobAsDataUrl(await response.blob());

		image.removeAttribute("srcset");
		image.crossOrigin = "anonymous";
		image.src = dataUrl;
	} catch {
		image.crossOrigin = "anonymous";
		image.referrerPolicy = "no-referrer";
		image.removeAttribute("srcset");
		image.src = src;
	}
};

const prepareImagesForExport = async (exportElement: HTMLElement) => {
	const images = Array.from(exportElement.querySelectorAll("img"));

	await Promise.all(images.map((image) => embedImageSource(image)));
};

const getColorFallback = (property: string) => {
	if (property.includes("background")) {
		return "transparent";
	}

	if (property.includes("shadow")) {
		return "none";
	}

	if (property.includes("border") || property.includes("outline")) {
		return "#d1d5db";
	}

	return "#111827";
};

const sanitizeInlineColorStyles = (element: HTMLElement) => {
	const inlineStyle = element.getAttribute("style");

	if (!inlineStyle || !UNSUPPORTED_COLOR_FUNCTION_PATTERN.test(inlineStyle)) {
		return;
	}

	const safeDeclarations = inlineStyle
		.split(";")
		.map((declaration) => declaration.trim())
		.filter(
			(declaration) =>
				declaration && !UNSUPPORTED_COLOR_FUNCTION_PATTERN.test(declaration),
		);

	if (safeDeclarations.length > 0) {
		element.setAttribute("style", safeDeclarations.join("; "));
		return;
	}

	element.removeAttribute("style");
};

const sanitizeComputedColorStyles = (element: HTMLElement) => {
	const view = element.ownerDocument.defaultView;

	if (!view) {
		return;
	}

	const computedStyle = view.getComputedStyle(element);
	const colorProperties = [
		"background-color",
		"border-bottom-color",
		"border-left-color",
		"border-right-color",
		"border-top-color",
		"box-shadow",
		"color",
		"outline-color",
		"text-decoration-color",
		"text-shadow",
	];

	for (const property of colorProperties) {
		const value = computedStyle.getPropertyValue(property);

		if (UNSUPPORTED_COLOR_FUNCTION_PATTERN.test(value)) {
			element.style.setProperty(property, getColorFallback(property));
		}
	}
};

const sanitizeUnsupportedColorStyles = (exportElement: HTMLElement) => {
	const elements = [
		exportElement,
		...Array.from(exportElement.querySelectorAll<HTMLElement>("*")),
	];

	for (const element of elements) {
		sanitizeInlineColorStyles(element);
		sanitizeComputedColorStyles(element);
	}
};

const createPdfExportElement = async (
	sourceElement: HTMLElement,
	pdf: PdfDocument,
): Promise<PreparedExportElement> => {
	const ownerDocument = sourceElement.ownerDocument ?? document;
	const wrapper = ownerDocument.createElement("div");
	const element = sourceElement.cloneNode(true) as HTMLElement;
	const layout = getPdfExportLayout(pdf);

	element.className = "markdown-body";
	Object.assign(wrapper.style, {
		background: "#ffffff",
		color: "#111827",
		left: "-10000px",
		margin: "0",
		padding: "0",
		pointerEvents: "none",
		position: "fixed",
		top: "0",
		width: `${layout.cssWidth}px`,
		zIndex: "-1",
	});
	Object.assign(element.style, {
		background: "#ffffff",
		boxSizing: "border-box",
		color: "#111827",
		margin: "0",
		maxWidth: `${layout.cssWidth}px`,
		padding: "0",
		width: `${layout.cssWidth}px`,
	});

	wrapper.append(element);
	ownerDocument.body.append(wrapper);
	sanitizeUnsupportedColorStyles(element);
	await prepareImagesForExport(element);

	return {
		cleanup: () => {
			wrapper.remove();
		},
		element,
		layout,
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
	const pdf = pdfFactory();
	const exportElement = await createPdfExportElement(sourceElement, pdf);

	try {
		const { windowHeight, windowWidth } = getExportCanvasWindowSize(
			sourceElement,
			exportElement.element,
			exportElement.layout,
		);
		const canvas = await canvasRenderer(exportElement.element, {
			backgroundColor: "#ffffff",
			scale: PDF_RENDER_SCALE,
			useCORS: true,
			windowHeight,
			windowWidth,
		});

		addCanvasToPdf(canvas, pdf);
		pdf.save(normalizedFilename);
	} finally {
		exportElement.cleanup();
	}

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
