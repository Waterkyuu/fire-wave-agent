import { importMarkdownToBlocks } from "@/lib/markdown-blocks/import-markdown";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { Editor, JSONContent } from "@tiptap/react";
import { createRef } from "react";
import MarkdownBlockEditor from "./markdown-block-editor";

jest.mock("@/lib/markdown-blocks/import-markdown", () => ({
	importMarkdownToBlocks: jest.fn(() => [
		{
			type: "heading",
			level: 1,
			content: [{ type: "text", text: "Report" }],
		},
		{
			type: "paragraph",
			content: [{ type: "text", text: "Hello export" }],
		},
		{
			type: "list",
			ordered: false,
			items: [{ content: [{ type: "text", text: "First item" }] }],
		},
	]),
}));

const importMarkdownToBlocksMock =
	importMarkdownToBlocks as jest.MockedFunction<typeof importMarkdownToBlocks>;

type HarnessProps = {
	editorRef: React.RefObject<Editor | null>;
	onMarkdownChange: (markdown: string) => void;
};

const updatedDocument: JSONContent = {
	type: "doc",
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Updated report" }],
		},
		{
			type: "paragraph",
			content: [{ type: "text", text: "Edited paragraph" }],
		},
		{
			type: "bulletList",
			content: [
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [{ type: "text", text: "Alpha" }],
						},
					],
				},
				{
					type: "listItem",
					content: [
						{
							type: "paragraph",
							content: [{ type: "text", text: "Beta" }],
						},
					],
				},
			],
		},
	],
};

const updatedTechnicalDocument: JSONContent = {
	type: "doc",
	content: [
		{
			type: "codeBlock",
			attrs: { language: "mermaid" },
			content: [{ type: "text", text: "graph TD\n  A[Alpha] --> B[Beta]" }],
		},
		{
			type: "codeBlock",
			attrs: { language: "latex" },
			content: [{ type: "text", text: "\\int_0^1 x^2 dx" }],
		},
	],
};

const EditorHarness = ({ editorRef, onMarkdownChange }: HarnessProps) => {
	const contentRef = createRef<HTMLElement>();

	const handleEditorReady = (editor: Editor | null) => {
		editorRef.current = editor;
	};

	const handleReplaceContent = () => {
		editorRef.current?.commands.setContent(updatedDocument);
	};

	return (
		<div>
			<button type="button" onClick={handleReplaceContent}>
				Replace content
			</button>
			<MarkdownBlockEditor
				contentRef={contentRef}
				markdownContent={"# Report\n\nHello export\n\n- First item"}
				onEditorReady={handleEditorReady}
				onMarkdownChange={onMarkdownChange}
			/>
		</div>
	);
};

describe("MarkdownBlockEditor", () => {
	it("serializes edited heading, paragraph, and list content", async () => {
		const editorRef = createRef<Editor | null>();
		const onMarkdownChange = jest.fn();

		await act(async () => {
			render(
				<EditorHarness
					editorRef={editorRef}
					onMarkdownChange={onMarkdownChange}
				/>,
			);
			await Promise.resolve();
		});

		expect(await screen.findByText("Report")).toBeVisible();
		expect(importMarkdownToBlocksMock).toHaveBeenCalledWith(
			"# Report\n\nHello export\n\n- First item",
		);

		fireEvent.click(screen.getByRole("button", { name: "Replace content" }));

		await waitFor(() =>
			expect(onMarkdownChange).toHaveBeenLastCalledWith(
				"# Updated report\n\nEdited paragraph\n\n- Alpha\n- Beta",
			),
		);
	});

	it("maps mermaid and math blocks through editable code-style nodes", async () => {
		importMarkdownToBlocksMock.mockImplementationOnce(() => [
			{
				type: "mermaidBlock",
				content: "graph TD\n  Start[Start] --> End[End]",
			},
			{
				type: "mathBlock",
				content: "E = mc^2",
			},
		]);

		const editorRef = createRef<Editor | null>();
		const onMarkdownChange = jest.fn();

		const TechnicalHarness = () => {
			const contentRef = createRef<HTMLElement>();

			const handleEditorReady = (editor: Editor | null) => {
				editorRef.current = editor;
			};

			const handleReplaceContent = () => {
				editorRef.current?.commands.setContent(updatedTechnicalDocument);
			};

			return (
				<div>
					<button type="button" onClick={handleReplaceContent}>
						Replace technical content
					</button>
					<MarkdownBlockEditor
						contentRef={contentRef}
						markdownContent={
							"```mermaid\ngraph TD\n  Start[Start] --> End[End]\n```\n\n$$\nE = mc^2\n$$"
						}
						onEditorReady={handleEditorReady}
						onMarkdownChange={onMarkdownChange}
					/>
				</div>
			);
		};

		await act(async () => {
			render(<TechnicalHarness />);
			await Promise.resolve();
		});

		const mermaidShell = await screen.findByTestId("code-block-shell-mermaid");
		const mathShell = await screen.findByTestId("code-block-shell-latex");

		expect(mermaidShell).toHaveTextContent("graph TD");
		expect(mermaidShell).toHaveTextContent("Start[Start] --> End[End]");
		expect(mathShell).toHaveTextContent("E = mc^2");

		fireEvent.click(
			screen.getByRole("button", { name: "Replace technical content" }),
		);

		await waitFor(() =>
			expect(onMarkdownChange).toHaveBeenLastCalledWith(
				"```mermaid\ngraph TD\n  A[Alpha] --> B[Beta]\n```\n\n$$\n\\int_0^1 x^2 dx\n$$",
			),
		);
	});

	it("deletes a selected technical block with backspace", async () => {
		importMarkdownToBlocksMock.mockImplementationOnce(() => [
			{
				type: "mermaidBlock",
				content: "graph TD\n  Start[Start] --> End[End]",
			},
			{
				type: "mathBlock",
				content: "E = mc^2",
			},
		]);

		const editorRef = createRef<Editor | null>();
		const onMarkdownChange = jest.fn();

		const TechnicalHarness = () => {
			const contentRef = createRef<HTMLElement>();

			const handleEditorReady = (editor: Editor | null) => {
				editorRef.current = editor;
			};

			return (
				<MarkdownBlockEditor
					contentRef={contentRef}
					markdownContent={
						"```mermaid\ngraph TD\n  Start[Start] --> End[End]\n```\n\n$$\nE = mc^2\n$$"
					}
					onEditorReady={handleEditorReady}
					onMarkdownChange={onMarkdownChange}
				/>
			);
		};

		await act(async () => {
			render(<TechnicalHarness />);
			await Promise.resolve();
		});

		const mermaidShell = await screen.findByTestId("code-block-shell-mermaid");

		fireEvent.mouseDown(mermaidShell);
		fireEvent.keyDown(mermaidShell, { key: "Backspace" });

		await waitFor(() =>
			expect(onMarkdownChange).toHaveBeenLastCalledWith("$$\nE = mc^2\n$$"),
		);
	});

	it("does not emit the flushSync lifecycle warning when technical blocks mount", async () => {
		importMarkdownToBlocksMock.mockImplementationOnce(() => [
			{
				type: "mermaidBlock",
				content: "graph TD\n  Start[Start] --> End[End]",
			},
		]);

		const consoleErrorSpy = jest
			.spyOn(console, "error")
			.mockImplementation(() => undefined);

		const contentRef = createRef<HTMLElement>();

		await act(async () => {
			render(
				<MarkdownBlockEditor
					contentRef={contentRef}
					markdownContent={
						"```mermaid\ngraph TD\n  Start[Start] --> End[End]\n```"
					}
				/>,
			);
			await Promise.resolve();
		});

		await screen.findByTestId("code-block-shell-mermaid");

		expect(
			consoleErrorSpy.mock.calls.some((call) =>
				call.some(
					(entry) =>
						typeof entry === "string" &&
						entry.includes(
							"flushSync was called from inside a lifecycle method",
						),
				),
			),
		).toBe(false);

		consoleErrorSpy.mockRestore();
	});
});
