import jotaiStore from "@/atoms";
import { workspaceDatasetAtom } from "@/atoms/chat";
import { zodGet } from "@/services/request";
import { DatasetDataResponseSchema } from "@/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import DatasetPanel from "./dataset-panel";

jest.mock("@/services/request", () => ({
	zodGet: jest.fn(),
}));

const previewPayload = {
	activeSheet: "Sheet1",
	columns: ["name", "value"],
	rows: [
		["alpha", "1"],
		["beta", "2"],
	],
	sheetNames: ["Sheet1"],
	totalColumns: 2,
	totalRows: 2,
};

const zodGetMock = zodGet as jest.MockedFunction<typeof zodGet>;

const createTestWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

const renderDatasetPanel = () =>
	render(<DatasetPanel />, { wrapper: createTestWrapper() });

describe("DatasetPanel", () => {
	beforeEach(() => {
		zodGetMock.mockResolvedValue({
			download_url: "https://public.example/cleaned_data.csv",
			file_id: "dataset-1",
			filename: "cleaned_data.csv",
			preview: previewPayload,
		});
	});

	afterEach(() => {
		act(() => {
			jotaiStore.set(workspaceDatasetAtom, null);
		});
		jest.clearAllMocks();
	});

	it("loads preview on demand when workspace dataset has no preview", async () => {
		jotaiStore.set(workspaceDatasetAtom, {
			downloadUrl: "https://public.example/cleaned_data.csv",
			fileId: "dataset-1",
			filename: "cleaned_data.csv",
		});

		renderDatasetPanel();

		await waitFor(() =>
			expect(zodGetMock).toHaveBeenCalledWith(
				"/file/dataset-1/dataset?rows=200",
				DatasetDataResponseSchema,
			),
		);

		await waitFor(() => {
			expect(screen.getByText("name")).toBeInTheDocument();
			expect(screen.getByText("alpha")).toBeInTheDocument();
		});
	});

	it("shows download button using resolved dataset url", async () => {
		jotaiStore.set(workspaceDatasetAtom, {
			downloadUrl: "https://public.example/cleaned_data.csv",
			fileId: "dataset-1",
			filename: "cleaned_data.csv",
		});

		renderDatasetPanel();

		const downloadLink = await screen.findByRole("link", { name: /download/i });
		expect(downloadLink).toHaveAttribute(
			"href",
			"https://public.example/cleaned_data.csv",
		);
	});

	it("does not refetch preview when the same dataset file id is updated", async () => {
		act(() => {
			jotaiStore.set(workspaceDatasetAtom, {
				downloadUrl: "https://public.example/cleaned_data.csv",
				fileId: "dataset-1",
				filename: "cleaned_data.csv",
			});
		});

		renderDatasetPanel();

		await waitFor(() => {
			expect(zodGetMock).toHaveBeenCalledTimes(1);
		});

		act(() => {
			jotaiStore.set(workspaceDatasetAtom, {
				downloadUrl: "https://public.example/cleaned_data-v2.csv",
				fileId: "dataset-1",
				filename: "cleaned_data.csv",
			});
		});

		expect(zodGetMock).toHaveBeenCalledTimes(1);
	});

	it("refetches preview when switching to a different dataset file id", async () => {
		zodGetMock
			.mockResolvedValueOnce({
				download_url: "https://public.example/uploaded-data.csv",
				file_id: "dataset-1",
				filename: "uploaded-data.csv",
				preview: {
					...previewPayload,
					rows: [["original", "10"]],
				},
			})
			.mockResolvedValueOnce({
				download_url: "https://public.example/cleaned-data.csv",
				file_id: "dataset-2",
				filename: "cleaned-data.csv",
				preview: {
					...previewPayload,
					rows: [["cleaned", "20"]],
				},
			});

		act(() => {
			jotaiStore.set(workspaceDatasetAtom, {
				downloadUrl: "https://public.example/uploaded-data.csv",
				fileId: "dataset-1",
				filename: "uploaded-data.csv",
			});
		});

		renderDatasetPanel();

		await screen.findByText("original");

		act(() => {
			jotaiStore.set(workspaceDatasetAtom, {
				downloadUrl: "https://public.example/cleaned-data.csv",
				fileId: "dataset-2",
				filename: "cleaned-data.csv",
			});
		});

		await waitFor(() =>
			expect(zodGetMock).toHaveBeenNthCalledWith(
				2,
				"/file/dataset-2/dataset?rows=200",
				DatasetDataResponseSchema,
			),
		);

		await waitFor(() => {
			expect(screen.getByText("cleaned")).toBeInTheDocument();
		});
	});
});
