"use client";

import { cn } from "@/lib/utils";
import {
	NodeViewContent,
	NodeViewWrapper,
	type ReactNodeViewProps,
} from "@tiptap/react";

const CodeBlockNodeView = ({
	editor,
	getPos,
	node,
	selected,
}: ReactNodeViewProps<HTMLDivElement>) => {
	const language =
		typeof node.attrs.language === "string" && node.attrs.language.length > 0
			? node.attrs.language
			: "plain";

	const handleShellMouseDown = (
		event: React.MouseEvent<HTMLDivElement, MouseEvent>,
	) => {
		const target = event.target as HTMLElement;

		if (target.closest("[data-code-content='true']")) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		const position = typeof getPos === "function" ? getPos() : getPos;

		if (position === undefined) {
			return;
		}

		editor.commands.setNodeSelection(position);
		event.currentTarget.focus();
	};

	const handleShellKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "Backspace" && event.key !== "Delete") {
			return;
		}

		if (!selected) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		const position = typeof getPos === "function" ? getPos() : getPos;

		if (position === undefined) {
			return;
		}

		const transaction = editor.state.tr.delete(
			position,
			position + node.nodeSize,
		);

		editor.view.dispatch(transaction);
	};

	return (
		<NodeViewWrapper
			data-testid={`code-block-shell-${language}`}
			tabIndex={0}
			className={cn(
				"overflow-hidden rounded-2xl border bg-slate-950 text-slate-50 shadow-sm transition-colors duration-200",
				selected && "border-sky-500 ring-2 ring-sky-500/50",
			)}
			onMouseDown={handleShellMouseDown}
			onKeyDown={handleShellKeyDown}
		>
			<div
				contentEditable={false}
				className="flex items-center justify-between border-white/10 border-b px-4 py-2 text-[11px] text-slate-300 uppercase tracking-[0.24em]"
			>
				<span>Block</span>
				<span>{language}</span>
			</div>
			<pre className="m-0 overflow-x-auto px-4 py-4">
				<NodeViewContent
					data-code-content="true"
					className={cn(
						"block whitespace-pre font-mono text-sm leading-7",
						language !== "plain" && `language-${language}`,
					)}
				/>
			</pre>
		</NodeViewWrapper>
	);
};

export default CodeBlockNodeView;
