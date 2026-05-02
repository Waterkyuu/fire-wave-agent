import { readFile } from "node:fs/promises";
import path from "node:path";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

type CreateMarkdownPrintHtmlOptions = {
	markdownContent: string;
};

type RenderAssets = {
	katexCss: string;
	markdownCss: string;
	mermaidScript: string;
};

let cachedAssetsPromise: Promise<RenderAssets> | null = null;

const loadRenderAssets = async (): Promise<RenderAssets> => {
	if (!cachedAssetsPromise) {
		cachedAssetsPromise = Promise.all([
			readFile(
				path.join(process.cwd(), "styles", "markdown-preview.css"),
				"utf8",
			),
			readFile(
				path.join(
					process.cwd(),
					"node_modules",
					"katex",
					"dist",
					"katex.min.css",
				),
				"utf8",
			),
			readFile(
				path.join(
					process.cwd(),
					"node_modules",
					"mermaid",
					"dist",
					"mermaid.min.js",
				),
				"utf8",
			),
		]).then(([markdownCss, katexCss, mermaidScript]) => ({
			katexCss,
			markdownCss,
			mermaidScript,
		}));
	}

	return cachedAssetsPromise;
};

const createMarkdownMarkup = async (markdownContent: string) => {
	const { renderToStaticMarkup } = await import("react-dom/server");

	return renderToStaticMarkup(
		<Markdown
			remarkPlugins={[remarkGfm, remarkMath]}
			rehypePlugins={[rehypeRaw, rehypeKatex]}
		>
			{markdownContent}
		</Markdown>,
	);
};

const createMermaidBootScript = () => `
window.__MERMAID_READY__ = (async () => {
	if (typeof mermaid === "undefined") {
		return;
	}

	mermaid.initialize({
		startOnLoad: false,
		theme: "default",
		securityLevel: "loose",
	});

	const blocks = Array.from(
		document.querySelectorAll("pre code.language-mermaid"),
	);

	for (const block of blocks) {
		const pre = block.closest("pre");
		const source = block.textContent ?? "";

		if (!pre || !source.trim()) {
			continue;
		}

		try {
			const id = \`mermaid-\${Math.random().toString(36).slice(2, 9)}\`;
			const { svg } = await mermaid.render(id, source);
			const wrapper = document.createElement("div");
			wrapper.className = "mermaid-diagram";
			wrapper.innerHTML = svg;
			pre.replaceWith(wrapper);
		} catch (error) {
			console.error("[PDF export mermaid render error]", error);
		}
	}
})();
`;

const escapeInlineScript = (script: string) =>
	script.replaceAll("</script", "<\\/script");

const createMarkdownPrintHtml = async ({
	markdownContent,
}: CreateMarkdownPrintHtmlOptions): Promise<string> => {
	const { katexCss, markdownCss, mermaidScript } = await loadRenderAssets();
	const markdownMarkup = await createMarkdownMarkup(markdownContent);

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Markdown Export</title>
		<style>
			@page {
				size: A4;
				margin: 18mm 16mm;
			}

			html {
				background: #ffffff;
			}

			body {
				margin: 0;
				background: #ffffff;
				color: #111827;
				font-family:
					"Geist",
					"Segoe UI",
					-apple-system,
					BlinkMacSystemFont,
					sans-serif;
			}

			main {
				box-sizing: border-box;
				width: 100%;
			}

			.markdown-body {
				max-width: 100%;
			}

			.mermaid-diagram {
				break-inside: avoid;
				margin: 1rem 0;
				overflow: hidden;
				text-align: center;
			}

			.mermaid-diagram svg {
				height: auto;
				max-width: 100%;
			}

			${katexCss}
			${markdownCss}
		</style>
	</head>
	<body>
		<main class="markdown-body">${markdownMarkup}</main>
		<script>${escapeInlineScript(mermaidScript)}</script>
		<script>${escapeInlineScript(createMermaidBootScript())}</script>
	</body>
</html>`;
};

export { createMarkdownPrintHtml };
export type { CreateMarkdownPrintHtmlOptions };
