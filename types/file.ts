import { z } from "zod";

const DatasetPreviewRowSchema = z.array(z.string());

const DatasetPreviewSchema = z.object({
	sheetNames: z.array(z.string()),
	activeSheet: z.string(),
	columns: z.array(z.string()),
	rows: z.array(DatasetPreviewRowSchema),
	totalRows: z.number().int().nonnegative(),
	totalColumns: z.number().int().nonnegative(),
});

const UploadedChunksSchema = z.object({
	uploadedChunks: z.array(z.number()),
});

const MergeFileResponseSchema = z.object({
	download_url: z.string(),
	file_id: z.string(),
	kind: z.enum(["dataset", "document"]).optional(),
});

const DatasetDataResponseSchema = z.object({
	download_url: z.string(),
	file_id: z.string(),
	filename: z.string(),
	preview: DatasetPreviewSchema,
});

const FileRecordSchema = z.object({
	id: z.string(),
	filename: z.string(),
	contentType: z.string().nullable().optional(),
	fileSize: z.number().nullable().optional(),
	status: z.string(),
	kind: z.enum(["document", "dataset"]).optional(),
	objectKey: z.string().nullable().optional(),
	preview: DatasetPreviewSchema.optional(),
	errorMessage: z.string().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

type DatasetPreviewRow = z.infer<typeof DatasetPreviewRowSchema>;
type DatasetPreview = z.infer<typeof DatasetPreviewSchema>;
type UploadedChunks = z.infer<typeof UploadedChunksSchema>;
type FileRecord = z.infer<typeof FileRecordSchema>;
type MergeFileResponse = z.infer<typeof MergeFileResponseSchema>;
type DatasetDataResponse = z.infer<typeof DatasetDataResponseSchema>;

export {
	DatasetPreviewSchema,
	DatasetDataResponseSchema,
	FileRecordSchema,
	MergeFileResponseSchema,
	UploadedChunksSchema,
};
export type {
	DatasetDataResponse,
	DatasetPreviewRow,
	DatasetPreview,
	FileRecord,
	MergeFileResponse,
	UploadedChunks,
};
