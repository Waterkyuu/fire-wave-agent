import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import MessageItem from "./message-item";

jest.mock("react-markdown", () => ({
	__esModule: true,
	default: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

const toolMessage: UIMessage = {
	id: "assistant-tool-message",
	role: "assistant",
	parts: [
		{
			type: "tool-searchDocs",
			toolCallId: "tool-call-1",
			state: "output-available",
			input: { query: "test query" },
			output: { result: "tool result payload" },
		},
	],
};

const reasoningMessage: UIMessage = {
	id: "assistant-reasoning-message",
	role: "assistant",
	parts: [
		{
			type: "reasoning",
			text: "I am analyzing the dataset.",
		},
		{
			type: "text",
			text: "Analysis complete.",
		},
	],
};

const multiReasoningMessage: UIMessage = {
	id: "assistant-multi-reasoning-message",
	role: "assistant",
	parts: [
		{
			type: "reasoning",
			text: "I am checking the first issue.",
		},
		{
			type: "text",
			text: "First issue complete.",
		},
		{
			type: "reasoning",
			text: "I am checking the second issue.",
		},
		{
			type: "text",
			text: "Second issue complete.",
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

	it("shows completed reasoning time instead of a stale thinking label", () => {
		render(
			<MessageItem
				message={reasoningMessage}
				thinkingTime={1.2}
				hasToolCalls={false}
			/>,
		);

		expect(screen.getByText("Thought for 1.2s")).toBeInTheDocument();
		expect(screen.getAllByText("Thought for 1.2s")).toHaveLength(1);
		expect(screen.queryByText("Thinking...")).not.toBeInTheDocument();
	});

	it("renders independent thinking times for each reasoning block", () => {
		render(
			<MessageItem
				message={multiReasoningMessage}
				thinkingTime={2.4}
				reasoningThinkingTimesByPartIndex={{ 0: 1.2, 2: 2.4 }}
				hasToolCalls={false}
			/>,
		);

		expect(screen.getByText("Thought for 1.2s")).toBeInTheDocument();
		expect(screen.getByText("Thought for 2.4s")).toBeInTheDocument();
	});
});
