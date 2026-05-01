"use client";

import "@/styles/markdown-preview.css";
import "katex/dist/katex.min.css";
import { workspaceMarkdownContentAtom } from "@/atoms";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAtomValue } from "jotai";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { memo } from "react";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import Mermaid from "./mermaid-chart";

const MarkdownCodeBlock = ({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<"code">) => {
	const langMatch = className?.match(/language-mermaid/);
	const codeString = String(children).replace(/\n$/, "");

	if (langMatch) {
		return <Mermaid chart={codeString} />;
	}

	return (
		<code {...props} className={className}>
			{children}
		</code>
	);
};

const MarkdownPreBlock = ({
	children,
	...props
}: ComponentPropsWithoutRef<"pre"> & { children?: ReactNode }) => {
	const child = children as ReactNode & {
		props?: { className?: string };
	};

	if (child?.props?.className?.includes("language-mermaid")) {
		return <>{children}</>;
	}

	return <pre {...props}>{children}</pre>;
};

const MarkdownPreview = () => {
	const markdownContent = useAtomValue(workspaceMarkdownContentAtom);

	return (
		<ScrollArea className="h-full w-full p-6">
			<article className="prose prose-sm dark:prose-invert markdown-body max-w-none">
				<Markdown
					remarkPlugins={[remarkGfm, remarkMath]}
					rehypePlugins={[rehypeRaw, rehypeKatex]}
					components={{
						code: MarkdownCodeBlock,
						pre: MarkdownPreBlock,
					}}
				>
					{markdownContent}
				</Markdown>
			</article>
		</ScrollArea>
	);
};

export default memo(MarkdownPreview);
