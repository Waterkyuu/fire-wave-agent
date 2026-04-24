import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import MessageArea from "./message-area";

jest.mock("./message-item", () => ({
	__esModule: true,
	default: ({
		message,
		thinkingTime,
		reasoningThinkingTimesByPartIndex,
	}: {
		message: UIMessage;
		thinkingTime: number | null;
		reasoningThinkingTimesByPartIndex?: Record<number, number>;
	}) => (
		<div>
			<span>{message.parts.find((part) => part.type === "text")?.text}</span>
			<span data-testid={`thinking-${message.id}`}>
				{thinkingTime == null ? "none" : thinkingTime.toFixed(1)}
			</span>
			{message.parts.map((part, index) =>
				part.type === "reasoning" ? (
					<span data-testid={`reasoning-${message.id}-${index}`} key={index}>
						{reasoningThinkingTimesByPartIndex?.[index] == null
							? "none"
							: reasoningThinkingTimesByPartIndex[index]?.toFixed(1)}
					</span>
				) : null,
			)}
		</div>
	),
}));

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
		Object.defineProperty(HTMLElement.prototype, "scrollTo", {
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

	it("shows a jump-to-latest button when the user scrolls away from bottom", () => {
		const historyMessages = [
			makeTextMessage("assistant-1", "assistant", "Loaded history message"),
		];

		render(
			<MessageArea
				messages={historyMessages}
				thinkingTime={null}
				className="min-h-0 flex-1"
			/>,
		);

		const scrollContainer = screen.getByTestId("message-area-scroll-container");

		Object.defineProperty(scrollContainer, "scrollHeight", {
			value: 1000,
			configurable: true,
		});
		Object.defineProperty(scrollContainer, "clientHeight", {
			value: 400,
			configurable: true,
		});
		Object.defineProperty(scrollContainer, "scrollTop", {
			value: 200,
			configurable: true,
		});

		fireEvent.scroll(scrollContainer);

		expect(
			screen.getByRole("button", { name: "Jump to latest" }),
		).toBeVisible();
	});

	it("keeps per-message thinking times stable when a newer assistant message completes", () => {
		const firstAssistantMessage = makeTextMessage(
			"assistant-1",
			"assistant",
			"First response",
		);
		const secondAssistantMessage = makeTextMessage(
			"assistant-2",
			"assistant",
			"Second response",
		);

		const { rerender } = render(
			<MessageArea
				messages={[firstAssistantMessage]}
				thinkingTime={3}
				className="min-h-0 flex-1"
			/>,
		);

		expect(screen.getByTestId("thinking-assistant-1")).toHaveTextContent("3.0");

		rerender(
			<MessageArea
				messages={[firstAssistantMessage, secondAssistantMessage]}
				thinkingTime={2}
				className="min-h-0 flex-1"
			/>,
		);

		expect(screen.getByTestId("thinking-assistant-1")).toHaveTextContent("3.0");
		expect(screen.getByTestId("thinking-assistant-2")).toHaveTextContent("2.0");
	});

	it("keeps each reasoning block's thinking time independent inside the same assistant message", () => {
		const firstReasoningMessage: UIMessage = {
			id: "assistant-reasoning-1",
			role: "assistant",
			parts: [
				{
					type: "reasoning",
					text: "Inspecting the first issue",
				},
				{
					type: "text",
					text: "First issue handled.",
				},
			],
		};
		const updatedReasoningMessage: UIMessage = {
			...firstReasoningMessage,
			parts: [
				...firstReasoningMessage.parts,
				{
					type: "reasoning",
					text: "Inspecting the second issue",
				},
				{
					type: "text",
					text: "Second issue handled.",
				},
			],
		};

		const { rerender } = render(
			<MessageArea
				messages={[firstReasoningMessage]}
				thinkingTime={3}
				className="min-h-0 flex-1"
			/>,
		);

		expect(
			screen.getByTestId("reasoning-assistant-reasoning-1-0"),
		).toHaveTextContent("3.0");

		rerender(
			<MessageArea
				messages={[updatedReasoningMessage]}
				thinkingTime={2}
				className="min-h-0 flex-1"
			/>,
		);

		expect(
			screen.getByTestId("reasoning-assistant-reasoning-1-0"),
		).toHaveTextContent("3.0");
		expect(
			screen.getByTestId("reasoning-assistant-reasoning-1-2"),
		).toHaveTextContent("2.0");
	});
});
