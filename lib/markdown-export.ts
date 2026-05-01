const MARKDOWN_EXPORT_BASENAME = "refract-markdown";
const MARKDOWN_PRINT_TITLE = "Refract Markdown Export";
const MARKDOWN_MIME_TYPE = "text/markdown;charset=utf-8";

type FileExtension = "md" | "pdf";

type DownloadBlobOptions = {
	document?: Document;
	url?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
};

type MarkdownFileExportOptions = DownloadBlobOptions & {
	filename?: string;
};

type MarkdownPdfExportOptions = {
	document?: Document;
	sourceElement: HTMLElement;
	title?: string;
	window?: Window;
};

type MarkdownPrintHtmlOptions = {
	bodyHtml: string;
	headMarkup?: string;
	title?: string;
};

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

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

const collectPrintableHeadMarkup = (sourceDocument: Document) => {
	const nodes = sourceDocument.querySelectorAll<
		HTMLLinkElement | HTMLStyleElement
	>('link[rel="stylesheet"], style');

	return Array.from(nodes)
		.map((node) => node.outerHTML)
		.join("\n");
};

const buildMarkdownPrintHtml = ({
	bodyHtml,
	headMarkup = "",
	title = MARKDOWN_PRINT_TITLE,
}: MarkdownPrintHtmlOptions) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${headMarkup}
<style>
	@page {
		margin: 18mm;
	}

	body {
		background: #ffffff;
		color: #18181b;
		font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		margin: 0;
	}

	.markdown-print-body {
		margin: 0 auto;
		max-width: 820px;
	}

	.markdown-print-body img,
	.markdown-print-body svg,
	.markdown-print-body canvas {
		max-width: 100%;
	}
</style>
</head>
<body>
<main class="markdown-print-body">
${bodyHtml}
</main>
</body>
</html>`;

const exportMarkdownPdf = ({
	document: sourceDocument = document,
	sourceElement,
	title = MARKDOWN_PRINT_TITLE,
	window: targetWindow = window,
}: MarkdownPdfExportOptions) => {
	const bodyHtml = sourceElement.innerHTML;

	if (!bodyHtml.trim()) {
		return false;
	}

	const printWindow = targetWindow.open("", "_blank");

	if (!printWindow) {
		return false;
	}

	const html = buildMarkdownPrintHtml({
		bodyHtml,
		headMarkup: collectPrintableHeadMarkup(sourceDocument),
		title,
	});

	printWindow.document.open();
	printWindow.document.write(html);
	printWindow.document.close();
	printWindow.setTimeout(() => {
		printWindow.focus();
		printWindow.print();
	}, 250);

	return true;
};

export {
	buildMarkdownPrintHtml,
	createMarkdownBlob,
	exportMarkdownFile,
	exportMarkdownPdf,
	withFileExtension,
};
export type { MarkdownFileExportOptions, MarkdownPdfExportOptions };
