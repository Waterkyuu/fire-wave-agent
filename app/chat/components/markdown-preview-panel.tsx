"use client";

import { workspaceMarkdownContentAtom } from "@/atoms";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAtomValue } from "jotai";
import { memo } from "react";
import Markdown from "react-markdown";

const MarkdownPreview = () => {
	const markdownContent = useAtomValue(workspaceMarkdownContentAtom);

	return (
		<ScrollArea className="h-full w-full p-6">
			<article className="prose prose-sm dark:prose-invert max-w-none">
				<Markdown>{markdownContent}</Markdown>
			</article>
		</ScrollArea>
	);
};

export default memo(MarkdownPreview);
