import jotaiStore from "@/atoms";
import {
	pendingHomePromptAtom,
	pendingHomeUploadsAtom,
	vncUrlAtom,
	workspaceChartAtom,
	workspaceDatasetAtom,
	workspaceFileAtom,
	workspaceTypstContentAtom,
	workspaceViewAtom,
} from "@/atoms/chat";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import ChatPage from "./page";

const mockUseChatHistory = jest.fn();
const mockCreateSession = jest.fn();
const mockSaveMessages = jest.fn();
const mockSetInput = jest.fn();
const mockAppend = jest.fn(async () => {});
const mockStop = jest.fn();

jest.mock("@/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

jest.mock("@/hooks/use-pipeline-chat", () => ({
	__esModule: true,
	default: () => ({
		messages: [],
		input: "",
		setInput: mockSetInput,
		append: mockAppend,
		isLoading: false,
		stop: mockStop,
		thinkingTime: null,
	}),
}));

jest.mock("@/services/chat", () => ({
	useChatHistory: (sessionId: string) => mockUseChatHistory(sessionId),
	useCreateSession: () => ({ mutateAsync: mockCreateSession }),
	useSaveMessages: () => ({ mutate: mockSaveMessages }),
}));

jest.mock("@/components/share/header", () => ({
	__esModule: true,
	default: () => <div data-testid="header" />,
}));

jest.mock("../components/message-area", () => ({
	__esModule: true,
	default: () => <div data-testid="message-area" />,
}));

jest.mock("../components/step-panel", () => ({
	__esModule: true,
	default: () => <div data-testid="step-panel" />,
}));

jest.mock("../components/workspace-panel", () => ({
	__esModule: true,
	default: () => <div data-testid="workspace-panel" />,
}));

jest.mock("@/components/share/input-field", () => ({
	__esModule: true,
	default: () => <div data-testid="input-field" />,
}));

jest.mock("@/components/ui/resizable", () => ({
	ResizablePanelGroup: ({ children }: { children: ReactNode }) => (
		<div data-testid="resizable-group">{children}</div>
	),
	ResizablePanel: ({ children }: { children: ReactNode }) => (
		<div data-testid="resizable-panel">{children}</div>
	),
	ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

jest.mock("@/components/ui/sheet", () => ({
	Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	SheetContent: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("ChatPage workspace reset", () => {
	beforeEach(() => {
		mockUseChatHistory.mockReturnValue({ data: [], isLoading: false });
		mockCreateSession.mockResolvedValue(undefined);
		mockSaveMessages.mockReset();
		mockSetInput.mockReset();
		mockAppend.mockClear();
		mockStop.mockClear();

		jotaiStore.set(vncUrlAtom, "https://old-vnc.example");
		jotaiStore.set(workspaceViewAtom, "chart");
		jotaiStore.set(workspaceChartAtom, {
			generatedAt: 1,
			title: "old-chart",
			toolCallId: "old-tool",
		});
		jotaiStore.set(workspaceDatasetAtom, {
			fileId: "old-dataset",
			filename: "old.csv",
		});
		jotaiStore.set(workspaceFileAtom, {
			extension: "CSV",
			fileId: "old-file",
			filename: "old.csv",
		});
		jotaiStore.set(workspaceTypstContentAtom, "old typst");
		jotaiStore.set(pendingHomePromptAtom, "");
		jotaiStore.set(pendingHomeUploadsAtom, []);
	});

	it("clears stale workspace state when entering a new chat session", async () => {
		render(<ChatPage params={Promise.resolve({ id: "session-new" })} />);

		await waitFor(() => {
			expect(mockUseChatHistory).toHaveBeenCalledWith("session-new");
		});

		await waitFor(() => {
			expect(jotaiStore.get(vncUrlAtom)).toBe("");
			expect(jotaiStore.get(workspaceViewAtom)).toBe("empty");
			expect(jotaiStore.get(workspaceChartAtom)).toBeNull();
			expect(jotaiStore.get(workspaceDatasetAtom)).toBeNull();
			expect(jotaiStore.get(workspaceFileAtom)).toBeNull();
			expect(jotaiStore.get(workspaceTypstContentAtom)).toBe("");
		});
	});
});
