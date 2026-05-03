import type { RefractBlock } from "@/types";

describe("exportBlocksToMarkdown", () => {
	it("serializes supported blocks back into markdown", async () => {
		const { exportBlocksToMarkdown } = await import("./export-markdown");

		const blocks: RefractBlock[] = [
			{
				type: "heading",
				level: 1,
				content: [{ type: "text", text: "Report" }],
			},
			{
				type: "paragraph",
				content: [{ type: "text", text: "Hello world" }],
			},
			{
				type: "list",
				ordered: false,
				items: [
					{ content: [{ type: "text", text: "Clean data" }] },
					{ content: [{ type: "text", text: "Build chart" }] },
				],
			},
			{
				type: "list",
				ordered: true,
				items: [
					{ content: [{ type: "text", text: "First" }] },
					{ content: [{ type: "text", text: "Second" }] },
				],
			},
			{
				type: "image",
				src: "https://example.com/revenue.png",
				alt: "Revenue",
			},
			{
				type: "codeBlock",
				language: "ts",
				content: 'console.log("hello");',
			},
			{
				type: "mermaidBlock",
				content: "graph TD\n  A[Start] --> B[Finish]",
			},
			{
				type: "mathBlock",
				content: "E = mc^2",
			},
			{
				type: "rawMarkdownBlock",
				markdown: "> preserved raw block",
			},
		];

		expect(exportBlocksToMarkdown(blocks)).toBe(`# Report

Hello world

- Clean data
- Build chart

1. First
2. Second

![Revenue](https://example.com/revenue.png)

\`\`\`ts
console.log("hello");
\`\`\`

\`\`\`mermaid
graph TD
  A[Start] --> B[Finish]
\`\`\`

$$
E = mc^2
$$

> preserved raw block`);
	});
});
