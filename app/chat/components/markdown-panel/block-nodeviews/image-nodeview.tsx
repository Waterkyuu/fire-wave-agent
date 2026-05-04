"use client";

import { cn } from "@/lib/utils";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";

const ImageNodeView = ({
	editor,
	getPos,
	node,
	selected,
}: ReactNodeViewProps<HTMLDivElement>) => {
	const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
	const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
	const title =
		typeof node.attrs.title === "string" && node.attrs.title.length > 0
			? node.attrs.title
			: "";

	const handleShellMouseDown = (
		event: React.MouseEvent<HTMLDivElement, MouseEvent>,
	) => {
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
			data-testid="image-block-shell"
			tabIndex={0}
			className={cn(
				"overflow-hidden rounded-3xl border bg-background shadow-sm transition-colors duration-200",
				selected && "border-sky-500 ring-2 ring-sky-500/50",
			)}
			onMouseDown={handleShellMouseDown}
			onKeyDown={handleShellKeyDown}
		>
			<div
				contentEditable={false}
				className="flex items-center justify-between border-b bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground uppercase tracking-[0.24em]"
			>
				<span>Image</span>
				<span>{title || alt || "Untitled"}</span>
			</div>
			<div className="space-y-3 p-4">
				<img
					alt={alt}
					src={src}
					className="w-full rounded-2xl border bg-muted/20 object-contain shadow-sm"
				/>
				<div className="space-y-1 text-sm">
					{alt ? <div className="font-medium">{alt}</div> : null}
					{title ? <div className="text-muted-foreground">{title}</div> : null}
				</div>
			</div>
		</NodeViewWrapper>
	);
};

export default ImageNodeView;
