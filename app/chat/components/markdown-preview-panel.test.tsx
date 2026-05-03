import jotaiStore, { workspaceMarkdownContentAtom } from "@/atoms";
import { importMarkdownToBlocks } from "@/lib/markdown-blocks/import-markdown";
import { exportMarkdownFile, exportMarkdownPdf } from "@/lib/markdown-export";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import MarkdownPreview from "./markdown-preview-panel";

jest.mock("@/lib/markdown-export", () => ({
	exportMarkdownFile: jest.fn(),
	exportMarkdownPdf: jest.fn(async () => "refract-markdown.pdf"),
}));

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
	]),
}));

const exportMarkdownFileMock = exportMarkdownFile as jest.MockedFunction<
	typeof exportMarkdownFile
>;
const exportMarkdownPdfMock = exportMarkdownPdf as jest.MockedFunction<
	typeof exportMarkdownPdf
>;
const importMarkdownToBlocksMock =
	importMarkdownToBlocks as jest.MockedFunction<typeof importMarkdownToBlocks>;

const renderMarkdownPreview = async () => {
	await act(async () => {
		render(<MarkdownPreview />);
		await Promise.resolve();
	});
};

describe("MarkdownPreview", () => {
	beforeEach(() => {
		act(() => {
			jotaiStore.set(workspaceMarkdownContentAtom, "# Report\n\nHello export");
		});
	});

	afterEach(() => {
		act(() => {
			jotaiStore.set(workspaceMarkdownContentAtom, "");
		});
		jest.clearAllMocks();
	});

	it("exports the raw markdown content from the export menu", async () => {
		await renderMarkdownPreview();
		await screen.findByText("Hello export");

		fireEvent.keyDown(screen.getByRole("button", { name: /export/i }), {
			key: "ArrowDown",
		});
		fireEvent.click(await screen.findByRole("menuitem", { name: /markdown/i }));

		expect(exportMarkdownFileMock).toHaveBeenCalledWith(
			"# Report\n\nHello export",
		);
	});

	it("downloads the rendered markdown preview as a pdf", async () => {
		await renderMarkdownPreview();
		await screen.findByText("Hello export");

		fireEvent.keyDown(screen.getByRole("button", { name: /export/i }), {
			key: "ArrowDown",
		});
		fireEvent.click(await screen.findByRole("menuitem", { name: /pdf/i }));

		await waitFor(() =>
			expect(exportMarkdownPdfMock).toHaveBeenCalledWith({
				sourceElement: expect.any(HTMLElement),
			}),
		);
	});

	it("mounts the markdown block editor shell with imported workspace content", async () => {
		await renderMarkdownPreview();

		expect(await screen.findByTestId("markdown-block-editor")).toBeVisible();
		expect(await screen.findByText("Report")).toBeVisible();
		expect(screen.getByText("Hello export")).toBeVisible();
		expect(importMarkdownToBlocksMock).toHaveBeenCalledWith(
			"# Report\n\nHello export",
		);
	});
});
