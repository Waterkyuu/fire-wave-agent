import { type DatasetDataResponse, DatasetDataResponseSchema } from "@/types";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { zodGet } from "./request";

const DEFAULT_DATASET_PREVIEW_ROWS = 200;

const getRequiredDatasetFileId = (fileId?: string) => {
	if (!fileId) {
		throw new Error("Dataset file id is required");
	}

	return fileId;
};

const getDatasetPreviewQueryKey = (
	fileId?: string,
	rows = DEFAULT_DATASET_PREVIEW_ROWS,
) => ["datasetPreview", fileId, rows] as const;

const fetchDatasetPreview = (
	fileId: string,
	rows = DEFAULT_DATASET_PREVIEW_ROWS,
): Promise<DatasetDataResponse> =>
	zodGet(`/file/${fileId}/dataset?rows=${rows}`, DatasetDataResponseSchema);

const useDatasetPreview = (
	fileId?: string,
	rows = DEFAULT_DATASET_PREVIEW_ROWS,
): UseQueryResult<DatasetDataResponse, Error> =>
	useQuery({
		queryKey: getDatasetPreviewQueryKey(fileId, rows),
		queryFn: () => fetchDatasetPreview(getRequiredDatasetFileId(fileId), rows),
		enabled: Boolean(fileId),
		retry: false,
		staleTime: Number.POSITIVE_INFINITY,
	});

export {
	DEFAULT_DATASET_PREVIEW_ROWS,
	fetchDatasetPreview,
	getDatasetPreviewQueryKey,
	useDatasetPreview,
};
