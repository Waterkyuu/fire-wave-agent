import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import MessageItem from "./message-item";

const toolMessage: UIMessage = {
	id: "assistant-tool-message",
	role: "assistant",
	parts: [
		{
			type: "tool-searchDocs",
			state: "output-available",
			input: { query: "test query" },
			output: { result: "tool result payload" },
		},
	],
};

describe("MessageItem tool details", () => {
	it("keeps tool details collapsed by default and toggles them with chevrons", () => {
		render(
			<MessageItem message={toolMessage} thinkingTime={null} hasToolCalls />,
		);

		expect(screen.queryByText(/tool result payload/i)).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Show tool details" }));

		expect(screen.getByText(/tool result payload/i)).toBeInTheDocument();
		expect(screen.getByText(/test query/i)).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Hide tool details" }));

		expect(screen.queryByText(/tool result payload/i)).not.toBeInTheDocument();
	});
});
