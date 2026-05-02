const MARKDOWN_EXPORT_BASENAME = "refract-markdown";
const MARKDOWN_MIME_TYPE = "text/markdown;charset=utf-8";

type FileExtension = "md" | "pdf";

type DownloadBlobOptions = {
	document?: Document;
	url?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
};

type MarkdownFileExportOptions = DownloadBlobOptions & {
	filename?: string;
};

type MarkdownPdfExportOptions = DownloadBlobOptions & {
	fetcher?: typeof fetch;
	filename?: string;
	markdownContent: string;
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

const getFilenameFromContentDisposition = (headerValue?: string | null) => {
	if (!headerValue) {
		return undefined;
	}

	const match = headerValue.match(/filename="?([^"]+)"?/i);

	if (!match?.[1]) {
		return undefined;
	}

	return decodeURIComponent(match[1]);
};

const exportMarkdownPdf = async ({
	document: targetDocument,
	fetcher = fetch,
	filename,
	markdownContent,
	url,
}: MarkdownPdfExportOptions) => {
	if (!markdownContent.trim()) {
		return false;
	}

	const response = await fetcher("/api/export/markdown/pdf", {
		body: JSON.stringify({
			filename,
			markdownContent,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		method: "POST",
	});

	if (!response.ok) {
		throw new Error("Failed to export markdown as PDF.");
	}

	const blob = await response.blob();
	const resolvedFilename =
		getFilenameFromContentDisposition(
			response.headers.get("Content-Disposition"),
		) ?? withFileExtension(filename ?? MARKDOWN_EXPORT_BASENAME, "pdf");

	downloadBlob(blob, resolvedFilename, {
		document: targetDocument,
		url,
	});

	return resolvedFilename;
};

export {
	createMarkdownBlob,
	exportMarkdownFile,
	exportMarkdownPdf,
	withFileExtension,
};
export type { MarkdownFileExportOptions, MarkdownPdfExportOptions };
