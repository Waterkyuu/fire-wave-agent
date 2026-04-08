import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import MessageArea from "./message-area";

const makeTextMessage = (
	id: string,
	role: UIMessage["role"],
	text: string,
): UIMessage => ({
	id,
	role,
	parts: [{ type: "text", text }],
});

describe("MessageArea history loading", () => {
	beforeAll(() => {
		Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
			value: jest.fn(),
			writable: true,
		});
	});

	it("shows a skeleton while history is loading and removes it after messages render", () => {
		const historyMessages = [
			makeTextMessage("assistant-1", "assistant", "Loaded history message"),
		];

		const { rerender } = render(
			<MessageArea
				messages={[]}
				thinkingTime={null}
				isHistoryLoading
				className="min-h-0 flex-1"
			/>,
		);

		expect(screen.getByTestId("chat-history-skeleton")).toBeInTheDocument();
		expect(
			screen.queryByText("Loaded history message"),
		).not.toBeInTheDocument();

		rerender(
			<MessageArea
				messages={historyMessages}
				thinkingTime={null}
				isHistoryLoading={false}
				className="min-h-0 flex-1"
			/>,
		);

		expect(
			screen.queryByTestId("chat-history-skeleton"),
		).not.toBeInTheDocument();
		expect(screen.getByText("Loaded history message")).toBeInTheDocument();
	});
});
