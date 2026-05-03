import type {
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
} from "@/types";

const renderInlineContent = (content: InlineContent[]): string =>
	content.map((item) => item.text).join("");

const renderListItem = (
	item: ListItemBlock,
	index: number,
	ordered: boolean,
): string => {
	const prefix = ordered ? `${index + 1}.` : "-";
	return `${prefix} ${renderInlineContent(item.content)}`;
};

const renderHeading = (block: RefractHeadingBlock): string =>
	`${"#".repeat(block.level)} ${renderInlineContent(block.content)}`;

const renderParagraph = (block: RefractParagraphBlock): string =>
	renderInlineContent(block.content);

const renderList = (block: RefractListBlock): string =>
	block.items
		.map((item, index) => renderListItem(item, index, block.ordered))
		.join("\n");

const renderImage = (block: RefractImageBlock): string => {
	const title = block.title ? ` "${block.title}"` : "";
	return `![${block.alt}](${block.src}${title})`;
};

const renderCodeBlock = (block: RefractCodeBlock): string => {
	const language = block.language ?? "";
	return `\`\`\`${language}\n${block.content}\n\`\`\``;
};

const renderMermaidBlock = (block: RefractMermaidBlock): string =>
	`\`\`\`mermaid\n${block.content}\n\`\`\``;

const renderMathBlock = (block: RefractMathBlock): string =>
	`$$\n${block.content}\n$$`;

const renderRawMarkdownBlock = (block: RefractRawMarkdownBlock): string =>
	block.markdown;

const exportBlocksToMarkdown = (blocks: RefractBlock[]): string =>
	blocks
		.map((block) => {
			switch (block.type) {
				case "heading":
					return renderHeading(block);
				case "paragraph":
					return renderParagraph(block);
				case "list":
					return renderList(block);
				case "image":
					return renderImage(block);
				case "codeBlock":
					return renderCodeBlock(block);
				case "mermaidBlock":
					return renderMermaidBlock(block);
				case "mathBlock":
					return renderMathBlock(block);
				case "rawMarkdownBlock":
					return renderRawMarkdownBlock(block);
				case "table":
					return "";
			}
		})
		.filter((value) => value.length > 0)
		.join("\n\n");

export { exportBlocksToMarkdown };
