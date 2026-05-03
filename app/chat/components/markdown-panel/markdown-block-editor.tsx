"use client";

import "@/styles/markdown-preview.css";
import "katex/dist/katex.min.css";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportBlocksToMarkdown } from "@/lib/markdown-blocks/export-markdown";
import { importMarkdownToBlocks } from "@/lib/markdown-blocks/import-markdown";
import type { InlineContent, RefractBlock } from "@/types";
import {
	type Editor,
	EditorContent,
	type JSONContent,
	useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { RefObject } from "react";
import { memo, useEffect, useRef, useState } from "react";
import RefractCodeBlock from "./extensions/refract-code-block";

type MarkdownBlockEditorProps = {
	contentRef: RefObject<HTMLElement | null>;
	markdownContent: string;
	onEditorReady?: (editor: Editor | null) => void;
	onMarkdownChange?: (markdown: string) => void;
};

type MaybePromise<T> = Promise<T> | T;

const createTextNode = (text: string): JSONContent | null =>
	text.length > 0
		? {
				type: "text",
				text,
			}
		: null;

const createParagraphNode = (text: string): JSONContent => {
	const textNode = createTextNode(text);

	return {
		type: "paragraph",
		content: textNode ? [textNode] : undefined,
	};
};

const renderInlineContent = (content: InlineContent[]): string =>
	content.map(({ text }) => text).join("");

const createInlineContent = (text: string): InlineContent[] =>
	text.length > 0 ? [{ type: "text", text }] : [];

const createFallbackNode = (markdown: string): JSONContent =>
	createParagraphNode(markdown);

const createCodeBlockNode = (
	content: string,
	language?: string | null,
): JSONContent => ({
	type: "codeBlock",
	attrs: { language: language ?? null },
	content: content
		? [
				{
					type: "text",
					text: content,
				},
			]
		: undefined,
});

const blockToEditorNodes = (block: RefractBlock): JSONContent[] => {
	switch (block.type) {
		case "heading": {
			const textNode = createTextNode(renderInlineContent(block.content));
			return [
				{
					type: "heading",
					attrs: { level: block.level },
					content: textNode ? [textNode] : undefined,
				},
			];
		}
		case "paragraph":
			return [createParagraphNode(renderInlineContent(block.content))];
		case "list":
			return [
				{
					type: block.ordered ? "orderedList" : "bulletList",
					content: block.items.map((item) => ({
						type: "listItem",
						content: [
							{
								type: "paragraph",
								content: item.content.map(({ text }) => ({
									type: "text",
									text,
								})),
							},
						],
					})),
				},
			];
		case "codeBlock":
			return [createCodeBlockNode(block.content, block.language ?? null)];
		case "image":
		case "rawMarkdownBlock":
			return [createFallbackNode(exportBlocksToMarkdown([block]))];
		case "mermaidBlock":
			return [createCodeBlockNode(block.content, "mermaid")];
		case "mathBlock":
			return [createCodeBlockNode(block.content, "latex")];
		case "table":
			return [createFallbackNode(exportBlocksToMarkdown([block]))];
	}
};

const createEditorDocument = (blocks: RefractBlock[]): JSONContent => ({
	type: "doc",
	content:
		blocks.length > 0
			? blocks.flatMap((block) => blockToEditorNodes(block))
			: [createParagraphNode("")],
});

const isPromiseLike = <T,>(value: MaybePromise<T>): value is Promise<T> =>
	typeof value === "object" &&
	value !== null &&
	"then" in value &&
	typeof value.then === "function";

const extractNodeText = (node: JSONContent): string => {
	if (node.type === "text") {
		return node.text ?? "";
	}

	return (node.content ?? []).map((child) => extractNodeText(child)).join("");
};

const extractListItemContent = (node: JSONContent): InlineContent[] => {
	const paragraphNode = (node.content ?? []).find(
		(child) => child.type === "paragraph",
	);
	return createInlineContent(
		paragraphNode ? extractNodeText(paragraphNode) : "",
	);
};

const editorNodeToBlocks = (node: JSONContent): RefractBlock[] => {
	switch (node.type) {
		case "heading":
			return [
				{
					type: "heading",
					level: Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 4) as
						| 1
						| 2
						| 3
						| 4,
					content: createInlineContent(extractNodeText(node)),
				},
			];
		case "paragraph":
			return [
				{
					type: "paragraph",
					content: createInlineContent(extractNodeText(node)),
				},
			];
		case "bulletList":
		case "orderedList":
			return [
				{
					type: "list",
					ordered: node.type === "orderedList",
					items: (node.content ?? []).map((item) => ({
						content: extractListItemContent(item),
					})),
				},
			];
		case "codeBlock":
			if (node.attrs?.language === "mermaid") {
				return [
					{
						type: "mermaidBlock",
						content: extractNodeText(node),
					},
				];
			}

			if (node.attrs?.language === "latex") {
				return [
					{
						type: "mathBlock",
						content: extractNodeText(node),
					},
				];
			}

			return [
				{
					type: "codeBlock",
					language:
						typeof node.attrs?.language === "string"
							? node.attrs.language
							: undefined,
					content: extractNodeText(node),
				},
			];
		default:
			return [];
	}
};

const editorDocumentToBlocks = (document: JSONContent): RefractBlock[] =>
	(document.content ?? []).flatMap((node) => editorNodeToBlocks(node));

const MarkdownBlockEditor = ({
	contentRef,
	markdownContent,
	onEditorReady,
	onMarkdownChange,
}: MarkdownBlockEditorProps) => {
	const [content, setContent] = useState<JSONContent>(createEditorDocument([]));
	const lastSyncedMarkdownRef = useRef<string | null>(null);

	const editor = useEditor({
		content,
		onUpdate: ({ editor: currentEditor }) => {
			if (!onMarkdownChange) {
				return;
			}

			const nextMarkdown = exportBlocksToMarkdown(
				editorDocumentToBlocks(currentEditor.getJSON()),
			);
			lastSyncedMarkdownRef.current = nextMarkdown;
			onMarkdownChange(nextMarkdown);
		},
		editorProps: {
			attributes: {
				class:
					"prose prose-sm dark:prose-invert markdown-body max-w-none focus:outline-none",
			},
		},
		editable: true,
		extensions: [StarterKit.configure({ codeBlock: false }), RefractCodeBlock],
		immediatelyRender: false,
	});

	useEffect(() => {
		if (!onEditorReady) {
			return;
		}

		onEditorReady(editor);
	}, [editor, onEditorReady]);

	useEffect(() => {
		if (
			lastSyncedMarkdownRef.current !== null &&
			markdownContent === lastSyncedMarkdownRef.current
		) {
			return;
		}

		let isActive = true;

		const loadBlocks = async () => {
			const importResult = importMarkdownToBlocks(
				markdownContent,
			) as MaybePromise<RefractBlock[]>;

			if (!isPromiseLike(importResult)) {
				setContent(createEditorDocument(importResult));
				lastSyncedMarkdownRef.current = markdownContent;
				return;
			}

			const blocks = await importResult;

			if (!isActive) {
				return;
			}

			setContent(createEditorDocument(blocks));
			lastSyncedMarkdownRef.current = markdownContent;
		};

		loadBlocks();

		return () => {
			isActive = false;
		};
	}, [markdownContent]);

	useEffect(() => {
		if (!editor) {
			return;
		}

		let cancelled = false;

		Promise.resolve().then(() => {
			if (cancelled) {
				return;
			}

			editor.commands.setContent(content, {
				emitUpdate: false,
				parseOptions: {
					preserveWhitespace: "full",
				},
			});
		});

		return () => {
			cancelled = true;
		};
	}, [content, editor]);

	return (
		<ScrollArea className="min-h-0 flex-1 p-6">
			<article
				ref={contentRef}
				className="min-h-full"
				data-testid="markdown-block-editor"
			>
				{editor ? <EditorContent editor={editor} /> : null}
			</article>
		</ScrollArea>
	);
};

export default memo(MarkdownBlockEditor);
