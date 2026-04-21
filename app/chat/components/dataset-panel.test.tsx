import jotaiStore from "@/atoms";
import { workspaceDatasetAtom } from "@/atoms/chat";
import { zodGet } from "@/services/request";
import { DatasetDataResponseSchema } from "@/types";
import { act, render, screen, waitFor } from "@testing-library/react";
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

		render(<DatasetPanel />);

		await waitFor(() =>
			expect(zodGetMock).toHaveBeenCalledWith(
				"/file/dataset-1/dataset?rows=200",
				DatasetDataResponseSchema,
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
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

		render(<DatasetPanel />);

		const downloadLink = await screen.findByRole("link", { name: /download/i });
		expect(downloadLink).toHaveAttribute(
			"href",
			"https://public.example/cleaned_data.csv",
		);
	});
});
