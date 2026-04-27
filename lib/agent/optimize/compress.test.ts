import type { UIMessage } from "ai";
import {
	DEFAULT_CONTEXT_COMPRESSION_OPTIONS,
	compressMessages,
} from "./compress";

type TestMessage = Omit<UIMessage, "id"> & { id?: string };

const makeTextMessage = (
	id: string,
	role: UIMessage["role"],
	text: string,
): TestMessage => ({
	id,
	role,
	parts: [{ type: "text", text }],
});

const readText = (message: TestMessage) =>
	message.parts
		.flatMap((part) => (part.type === "text" ? [part.text] : []))
		.join("\n");

describe("compressMessages", () => {
	it("keeps anchor and recent messages while summarizing older middle context", () => {
		const messages: TestMessage[] = [
			makeTextMessage("user-1", "user", "Initial project goal"),
			makeTextMessage("assistant-1", "assistant", "Initial answer"),
			makeTextMessage("user-2", "user", "Older data request"),
			makeTextMessage("assistant-2", "assistant", "Older data answer"),
			makeTextMessage("user-3", "user", "Middle chart request"),
			makeTextMessage("assistant-3", "assistant", "Middle chart answer"),
			makeTextMessage("user-4", "user", "Recent follow-up"),
			makeTextMessage("assistant-4", "assistant", "Recent answer"),
		];

		const result = compressMessages(messages, {
			anchorMessageCount: 1,
			recentMessageCount: 2,
			targetCharacterBudget: 180,
		});

		expect(result.messages).toHaveLength(4);
		expect(result.messages[0]?.id).toBe("user-1");
		expect(result.messages[2]?.id).toBe("user-4");
		expect(result.messages[3]?.id).toBe("assistant-4");
		expect(result.stats.summaryInserted).toBe(true);

		const summaryText = readText(result.messages[1] as TestMessage);
		expect(summaryText).toContain("Compressed conversation summary");
		expect(summaryText).toContain("Older data request");
		expect(summaryText).toContain("Middle chart answer");
		expect(summaryText).not.toContain("Recent follow-up");
	});

	it("trims large tool payloads before preserving recent context", () => {
		const largePng = "a".repeat(
			DEFAULT_CONTEXT_COMPRESSION_OPTIONS.maxToolOutputCharacters + 500,
		);
		const messages: TestMessage[] = [
			{
				id: "assistant-tool",
				role: "assistant",
				parts: [
					{
						type: "tool-codeInterpreter",
						toolCallId: "tool-1",
						state: "output-available",
						output: {
							results: [{ png: largePng, stdout: "x".repeat(2_000) }],
						},
					} as unknown as UIMessage["parts"][number],
				],
			},
		];

		const result = compressMessages(messages, {
			recentMessageCount: 1,
			targetCharacterBudget: 20,
		});

		const [message] = result.messages;
		const [part] = (message as TestMessage).parts;
		const output = (part as unknown as { output: Record<string, unknown> })
			.output;
		const results = output.results as Array<Record<string, string>>;

		expect(results[0]?.png).toBe("[omitted large binary output]");
		expect(results[0]?.stdout.length).toBeLessThan(400);
		expect(messages[0]?.parts[0]).not.toBe(part);
	});

	it("reports no compression summary when the sanitized messages fit the budget", () => {
		const messages: TestMessage[] = [
			makeTextMessage("user-1", "user", "Small question"),
			makeTextMessage("assistant-1", "assistant", "Small answer"),
		];

		const result = compressMessages(messages, {
			targetCharacterBudget: 10_000,
		});

		expect(result.messages).toHaveLength(2);
		expect(result.stats.summaryInserted).toBe(false);
		expect(result.stats.originalMessageCount).toBe(2);
		expect(result.stats.compressedMessageCount).toBe(2);
	});
});
