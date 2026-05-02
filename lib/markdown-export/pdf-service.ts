import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import { createMarkdownPrintHtml } from "./pdf-renderer";

type RenderMarkdownPdfOptions = {
	filename?: string;
	markdownContent: string;
};

type RenderMarkdownPdfResult = {
	bytes: Uint8Array;
	filename: string;
};

type PdfPage = {
	close: () => Promise<void>;
	emulateMediaType: (type?: "screen" | "print" | null) => Promise<void>;
	evaluate: <T>(pageFunction: () => Promise<T>) => Promise<T>;
	pdf: (options: Record<string, unknown>) => Promise<Uint8Array>;
	setContent: (
		html: string,
		options?: { waitUntil?: "domcontentloaded" | "load" | "networkidle0" },
	) => Promise<void>;
	waitForFunction: (
		pageFunction: () => unknown,
		options?: { timeout?: number },
	) => Promise<unknown>;
};

type PdfBrowser = {
	close: () => Promise<void>;
	newPage: () => Promise<PdfPage>;
};

type RenderMarkdownPdfDeps = {
	createHtml?: typeof createMarkdownPrintHtml;
	launchBrowser?: () => Promise<PdfBrowser>;
};

const MARKDOWN_EXPORT_BASENAME = "refract-markdown";

const withPdfExtension = (filename?: string) => {
	const cleanFilename = filename?.trim() || MARKDOWN_EXPORT_BASENAME;
	const filenameWithoutExtension = cleanFilename.replace(/\.[^/.]+$/, "");

	return `${filenameWithoutExtension}.pdf`;
};

const resolveExecutablePath = async () => {
	if (process.env.PUPPETEER_EXECUTABLE_PATH) {
		return {
			executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
			isLocalExecutable: true,
		};
	}

	if (process.env.CHROMIUM_PACK_URL) {
		return {
			executablePath: await chromium.executablePath(
				process.env.CHROMIUM_PACK_URL,
			),
			isLocalExecutable: false,
		};
	}

	throw new Error(
		"PDF export requires PUPPETEER_EXECUTABLE_PATH locally or CHROMIUM_PACK_URL on deployed runtimes.",
	);
};

const launchMarkdownPdfBrowser = async (): Promise<PdfBrowser> => {
	const { executablePath, isLocalExecutable } = await resolveExecutablePath();

	if (isLocalExecutable) {
		return puppeteer.launch({
			args: puppeteer.defaultArgs(),
			executablePath,
			headless: true,
		}) as Promise<PdfBrowser>;
	}

	return puppeteer.launch({
		args: puppeteer.defaultArgs({
			args: chromium.args,
			headless: "shell",
		}),
		executablePath,
		headless: "shell",
	}) as Promise<PdfBrowser>;
};

const waitForRenderedContent = async (page: PdfPage) => {
	await page.waitForFunction(
		() =>
			(
				window as Window & {
					__MERMAID_READY__?: Promise<unknown>;
				}
			).__MERMAID_READY__ !== undefined,
		{
			timeout: 10_000,
		},
	);

	await page.evaluate(async () => {
		if ("fonts" in document) {
			await document.fonts.ready;
		}

		const images = Array.from(document.images).filter(
			(image) => !image.complete,
		);
		await Promise.all(
			images.map(
				(image) =>
					new Promise<void>((resolve) => {
						image.addEventListener("load", () => resolve(), { once: true });
						image.addEventListener("error", () => resolve(), { once: true });
					}),
			),
		);

		const mermaidReady = (
			window as Window & {
				__MERMAID_READY__?: Promise<unknown>;
			}
		).__MERMAID_READY__;

		if (mermaidReady) {
			await mermaidReady;
		}
	});
};

const renderMarkdownPdf = async (
	{ filename, markdownContent }: RenderMarkdownPdfOptions,
	{
		createHtml = createMarkdownPrintHtml,
		launchBrowser = launchMarkdownPdfBrowser,
	}: RenderMarkdownPdfDeps = {},
): Promise<RenderMarkdownPdfResult> => {
	const html = await createHtml({ markdownContent });
	const browser = await launchBrowser();
	const page = await browser.newPage();

	try {
		await page.setContent(html, { waitUntil: "networkidle0" });
		await page.emulateMediaType("screen");
		await waitForRenderedContent(page);

		const bytes = await page.pdf({
			format: "A4",
			margin: {
				bottom: "18mm",
				left: "16mm",
				right: "16mm",
				top: "18mm",
			},
			printBackground: true,
		});

		return {
			bytes,
			filename: withPdfExtension(filename),
		};
	} finally {
		await page.close();
		await browser.close();
	}
};

export { renderMarkdownPdf };
export type {
	PdfBrowser,
	PdfPage,
	RenderMarkdownPdfOptions,
	RenderMarkdownPdfResult,
};
