"use client";

import "@/styles/markdown-preview.css";
import "katex/dist/katex.min.css";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportBlocksToMarkdown } from "@/lib/markdown-blocks/export-markdown";
import { importMarkdownToBlocks } from "@/lib/markdown-blocks/import-markdown";
import type { InlineContent, RefractBlock } from "@/types";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { RefObject } from "react";
import { memo, useEffect, useState } from "react";

type MarkdownBlockEditorProps = {
	contentRef: RefObject<HTMLElement | null>;
	markdownContent: string;
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

const createFallbackNode = (markdown: string): JSONContent =>
	createParagraphNode(markdown);

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
			return [
				{
					type: "codeBlock",
					attrs: { language: block.language ?? null },
					content: block.content
						? [
								{
									type: "text",
									text: block.content,
								},
							]
						: undefined,
				},
			];
		case "image":
		case "mermaidBlock":
		case "mathBlock":
		case "rawMarkdownBlock":
			return [createFallbackNode(exportBlocksToMarkdown([block]))];
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

const MarkdownBlockEditor = ({
	contentRef,
	markdownContent,
}: MarkdownBlockEditorProps) => {
	const [content, setContent] = useState<JSONContent>(createEditorDocument([]));

	const editor = useEditor({
		content,
		editorProps: {
			attributes: {
				class:
					"prose prose-sm dark:prose-invert markdown-body max-w-none focus:outline-none",
			},
		},
		editable: false,
		extensions: [StarterKit],
		immediatelyRender: false,
	});

	useEffect(() => {
		let isActive = true;

		const loadBlocks = async () => {
			const importResult = importMarkdownToBlocks(
				markdownContent,
			) as MaybePromise<RefractBlock[]>;

			if (!isPromiseLike(importResult)) {
				setContent(createEditorDocument(importResult));
				return;
			}

			const blocks = await importResult;

			if (!isActive) {
				return;
			}

			setContent(createEditorDocument(blocks));
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

		editor.commands.setContent(content, {
			emitUpdate: false,
			parseOptions: {
				preserveWhitespace: "full",
			},
		});
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
