type TextInlineContent = {
	type: "text";
	text: string;
};

type InlineContent = TextInlineContent;

type ListItemBlock = {
	content: InlineContent[];
};

type TableRow = {
	cells: InlineContent[][];
};

type RefractParagraphBlock = {
	type: "paragraph";
	content: InlineContent[];
};

type RefractHeadingBlock = {
	level: 1 | 2 | 3 | 4;
	type: "heading";
	content: InlineContent[];
};

type RefractListBlock = {
	items: ListItemBlock[];
	ordered: boolean;
	type: "list";
};

type RefractTableBlock = {
	rows: TableRow[];
	type: "table";
};

type RefractImageBlock = {
	alt: string;
	src: string;
	title?: string;
	type: "image";
};

type RefractCodeBlock = {
	content: string;
	language?: string;
	type: "codeBlock";
};

type RefractMermaidBlock = {
	content: string;
	type: "mermaidBlock";
};

type RefractMathBlock = {
	content: string;
	type: "mathBlock";
};

type RefractRawMarkdownBlock = {
	markdown: string;
	type: "rawMarkdownBlock";
};

type RefractBlock =
	| RefractParagraphBlock
	| RefractHeadingBlock
	| RefractListBlock
	| RefractTableBlock
	| RefractImageBlock
	| RefractCodeBlock
	| RefractMermaidBlock
	| RefractMathBlock
	| RefractRawMarkdownBlock;

export type {
	InlineContent,
	ListItemBlock,
	RefractBlock,
	RefractCodeBlock,
	RefractHeadingBlock,
	RefractImageBlock,
	RefractListBlock,
	RefractMathBlock,
	RefractMermaidBlock,
	RefractParagraphBlock,
	RefractRawMarkdownBlock,
	RefractTableBlock,
	TableRow,
	TextInlineContent,
};
