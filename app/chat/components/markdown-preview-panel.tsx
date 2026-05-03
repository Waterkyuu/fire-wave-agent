"use client";

import "@/styles/markdown-preview.css";
import "katex/dist/katex.min.css";
import { workspaceMarkdownContentAtom } from "@/atoms";
import { exportMarkdownFile, exportMarkdownPdf } from "@/lib/markdown-export";
import { useAtomValue } from "jotai";
import { memo, useCallback, useRef, useState } from "react";
import MarkdownBlockEditor from "./markdown-panel/markdown-block-editor";
import MarkdownBlockToolbar from "./markdown-panel/markdown-block-toolbar";

const MarkdownPreview = () => {
	const markdownContent = useAtomValue(workspaceMarkdownContentAtom);
	const previewRef = useRef<HTMLElement>(null);
	const [isExportingPdf, setIsExportingPdf] = useState(false);
	const hasMarkdownContent = markdownContent.trim().length > 0;

	const handleExportMarkdown = useCallback(() => {
		exportMarkdownFile(markdownContent);
	}, [markdownContent]);

	const handleExportPdf = useCallback(async () => {
		if (isExportingPdf || !hasMarkdownContent || !previewRef.current) {
			return;
		}

		setIsExportingPdf(true);

		try {
			await exportMarkdownPdf({
				sourceElement: previewRef.current,
			});
		} finally {
			setIsExportingPdf(false);
		}
	}, [hasMarkdownContent, isExportingPdf]);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<MarkdownBlockToolbar
				hasMarkdownContent={hasMarkdownContent}
				isExportingPdf={isExportingPdf}
				onExportMarkdown={handleExportMarkdown}
				onExportPdf={handleExportPdf}
			/>
			<MarkdownBlockEditor
				contentRef={previewRef}
				markdownContent={markdownContent}
			/>
		</div>
	);
};

export default memo(MarkdownPreview);
