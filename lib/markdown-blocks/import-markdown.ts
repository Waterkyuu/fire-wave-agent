import type { RefractBlock, TextInlineContent } from "@/types";

type MdastNode = {
	alt?: string | null;
	children?: MdastNode[];
	depth?: number;
	lang?: string | null;
	ordered?: boolean;
	title?: string | null;
	type: string;
	url?: string;
	value?: string;
};

const loadEsmModule = <T>(specifier: string): Promise<T> =>
	new Function("modulePath", "return import(modulePath);")(
		specifier,
	) as Promise<T>;

const createTextContent = (text: string): TextInlineContent[] => {
	const trimmedText = text.trim();

	if (!trimmedText) {
		return [];
	}

	return [{ type: "text", text: trimmedText }];
};

const extractTextFromNodes = (nodes: MdastNode[] = []): string =>
	nodes
		.flatMap((node) => {
			if (node.type === "text" || node.type === "inlineCode") {
				return node.value ?? "";
			}

			if (node.children) {
				return extractTextFromNodes(node.children);
			}

			return "";
		})
		.join("");

const extractListItemText = (node: MdastNode): string => {
	const firstParagraph = node.children?.find(
		(child) => child.type === "paragraph",
	);
	return extractTextFromNodes(firstParagraph?.children ?? node.children ?? []);
};

const importMarkdownToBlocks = async (
	markdown: string,
): Promise<RefractBlock[]> => {
	const { unified } = await loadEsmModule<typeof import("unified")>("unified");
	const { default: remarkParse } =
		await loadEsmModule<typeof import("remark-parse")>("remark-parse");
	const { default: remarkGfm } =
		await loadEsmModule<typeof import("remark-gfm")>("remark-gfm");
	const { default: remarkMath } =
		await loadEsmModule<typeof import("remark-math")>("remark-math");

	const tree = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkMath)
		.parse(markdown) as MdastNode;

	return (tree.children ?? []).flatMap((node): RefractBlock[] => {
		if (node.type === "heading") {
			const level = Math.min(Math.max(node.depth ?? 1, 1), 4) as 1 | 2 | 3 | 4;
			return [
				{
					type: "heading",
					level,
					content: createTextContent(extractTextFromNodes(node.children)),
				},
			];
		}

		if (node.type === "paragraph") {
			const paragraphChildren = node.children ?? [];
			const imageChild =
				paragraphChildren.length === 1 && paragraphChildren[0]?.type === "image"
					? paragraphChildren[0]
					: null;

			if (imageChild?.url) {
				return [
					{
						type: "image",
						src: imageChild.url,
						alt: imageChild.alt ?? "",
						...(imageChild.title ? { title: imageChild.title } : {}),
					},
				];
			}

			return [
				{
					type: "paragraph",
					content: createTextContent(extractTextFromNodes(paragraphChildren)),
				},
			];
		}

		if (node.type === "list") {
			return [
				{
					type: "list",
					ordered: Boolean(node.ordered),
					items: (node.children ?? []).map((child) => ({
						content: createTextContent(extractListItemText(child)),
					})),
				},
			];
		}

		if (node.type === "code") {
			if (node.lang === "mermaid") {
				return [
					{
						type: "mermaidBlock",
						content: node.value ?? "",
					},
				];
			}

			return [
				{
					type: "codeBlock",
					...(node.lang ? { language: node.lang } : {}),
					content: node.value ?? "",
				},
			];
		}

		if (node.type === "math") {
			return [
				{
					type: "mathBlock",
					content: (node.value ?? "").trim(),
				},
			];
		}

		return [];
	});
};

export { importMarkdownToBlocks };
