"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download, FileText } from "lucide-react";
import { memo } from "react";

type MarkdownBlockToolbarProps = {
	hasMarkdownContent: boolean;
	isExportingPdf: boolean;
	onExportMarkdown: () => void;
	onExportPdf: () => void;
};

const MarkdownBlockToolbar = ({
	hasMarkdownContent,
	isExportingPdf,
	onExportMarkdown,
	onExportPdf,
}: MarkdownBlockToolbarProps) => (
	<div className="flex items-center justify-end border-b px-4 py-3">
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={!hasMarkdownContent}
					className="transition-colors duration-200"
				>
					<Download className="size-3.5" />
					Export
					<ChevronDown className="size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-40">
				<DropdownMenuItem onClick={onExportPdf} disabled={isExportingPdf}>
					<FileText className="size-4" />
					{isExportingPdf ? "PDF..." : "PDF"}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={onExportMarkdown}>
					<FileText className="size-4" />
					Markdown
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
);

export default memo(MarkdownBlockToolbar);
