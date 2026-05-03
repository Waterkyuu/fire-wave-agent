import { fireEvent, render, screen } from "@testing-library/react";
import BlockEditorDemoPage from "./page";

jest.mock("@/components/share/header", () => ({
	__esModule: true,
	default: () => <div>Header</div>,
}));

jest.mock("@/app/chat/components/markdown-panel/markdown-block-editor", () => ({
	__esModule: true,
	default: ({
		markdownContent,
	}: {
		markdownContent: string;
	}) => <div data-testid="demo-editor">{markdownContent}</div>,
}));

describe("BlockEditorDemoPage", () => {
	it("lets the user switch presets and mirrors markdown into the demo editor", () => {
		render(<BlockEditorDemoPage />);

		expect(
			screen.getByRole("heading", { name: /block editor playground/i }),
		).toBeVisible();
		expect(
			String(
				(screen.getByLabelText(/markdown source/i) as HTMLTextAreaElement)
					.value,
			),
		).toContain("# Quarterly Report");
		expect(screen.getByTestId("demo-editor")).toHaveTextContent(
			"# Quarterly Report",
		);

		fireEvent.click(screen.getByRole("button", { name: /technical blocks/i }));

		expect(
			String(
				(screen.getByLabelText(/markdown source/i) as HTMLTextAreaElement)
					.value,
			),
		).toContain("```mermaid");
		expect(screen.getByTestId("demo-editor")).toHaveTextContent("```mermaid");
	});
});
