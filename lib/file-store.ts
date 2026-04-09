import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { S3 } from "@/infra/r2";
import {
	type DatasetPreview,
	type FileRecord,
	FileRecordSchema,
} from "@/types";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { read, utils } from "xlsx";

const BUCKET_NAME = process.env.BUCKET_NAME ?? "";
const FILE_STORE_ROOT = join(tmpdir(), "agent-dashboard-files");
const CHUNKS_ROOT = join(FILE_STORE_ROOT, "chunks");
const RECORDS_ROOT = join(FILE_STORE_ROOT, "records");
const DATASET_EXTENSIONS = new Set(["csv", "xlsx", "xls"]);
const DATASET_PREVIEW_ROW_LIMIT = 50;

const ensureStorageDirs = async () => {
	await mkdir(CHUNKS_ROOT, { recursive: true });
	await mkdir(RECORDS_ROOT, { recursive: true });
};

const sanitizeFilename = (filename: string) => basename(filename);

const getFilenameExtension = (filename: string) =>
	sanitizeFilename(filename).split(".").pop()?.toLowerCase() ?? "";

const isDatasetFilename = (filename: string) =>
	DATASET_EXTENSIONS.has(getFilenameExtension(filename));

const getFilenameToken = (filename: string) =>
	Buffer.from(sanitizeFilename(filename)).toString("base64url");

const getChunkDir = (filename: string) =>
	join(CHUNKS_ROOT, getFilenameToken(filename));

const getChunkPath = (filename: string, index: number) =>
	join(getChunkDir(filename), `${index}.part`);

const getRecordPath = (fileId: string) => join(RECORDS_ROOT, `${fileId}.json`);

const normalizePreviewRows = (rows: unknown[][], totalColumns: number) =>
	rows.map((row) =>
		Array.from({ length: totalColumns }, (_, index) =>
			String(row[index] ?? ""),
		),
	);

const buildDatasetPreview = (
	buffer: Buffer,
	filename: string,
): DatasetPreview | undefined => {
	if (!isDatasetFilename(filename)) {
		return undefined;
	}

	const workbook = read(buffer, {
		type: "buffer",
		cellDates: true,
		cellText: true,
		dense: true,
	});
	const activeSheet = workbook.SheetNames[0];
	if (!activeSheet) {
		return {
			sheetNames: [],
			activeSheet: "",
			columns: [],
			rows: [],
			totalRows: 0,
			totalColumns: 0,
		};
	}

	const worksheet = workbook.Sheets[activeSheet];
	const rawRows = (
		utils.sheet_to_json(worksheet, {
			header: 1,
			raw: false,
			defval: "",
			blankrows: false,
		}) as unknown[][]
	).map((row) => (Array.isArray(row) ? row : []));

	const headerRow = rawRows[0] ?? [];
	const bodyRows = rawRows.slice(1);
	const totalColumns = Math.max(
		headerRow.length,
		...bodyRows.map((row) => row.length),
		0,
	);
	const columns = Array.from({ length: totalColumns }, (_, index) => {
		const headerValue = headerRow[index];
		const normalized = String(headerValue ?? "").trim();
		return normalized || `Column ${index + 1}`;
	});

	return {
		sheetNames: workbook.SheetNames,
		activeSheet,
		columns,
		rows: normalizePreviewRows(
			bodyRows.slice(0, DATASET_PREVIEW_ROW_LIMIT),
			totalColumns,
		),
		totalRows: bodyRows.length,
		totalColumns,
	};
};

const saveFileRecord = async (record: FileRecord) => {
	await ensureStorageDirs();
	await writeFile(
		getRecordPath(record.id),
		JSON.stringify(record, null, 2),
		"utf8",
	);
};

const writeChunkFile = async ({
	chunk,
	filename,
	index,
}: {
	chunk: Uint8Array;
	filename: string;
	index: number;
}) => {
	const safeFilename = sanitizeFilename(filename);
	const chunkDir = getChunkDir(safeFilename);

	await ensureStorageDirs();
	await mkdir(chunkDir, { recursive: true });
	await writeFile(getChunkPath(safeFilename, index), Buffer.from(chunk));
};

const mergeUploadedFile = async ({
	contentType,
	filename,
	totalChunks,
}: {
	contentType?: string | null;
	filename: string;
	totalChunks: number;
}) => {
	if (!BUCKET_NAME) {
		throw new Error("BUCKET_NAME is not configured.");
	}

	const safeFilename = sanitizeFilename(filename);
	const chunkBuffers = await Promise.all(
		Array.from({ length: totalChunks }, async (_, index) =>
			readFile(getChunkPath(safeFilename, index)),
		),
	);
	const mergedBuffer = Buffer.concat(chunkBuffers);
	const fileId = crypto.randomUUID();
	const objectKey = `${fileId}/${safeFilename}`;
	const preview = buildDatasetPreview(mergedBuffer, safeFilename);
	const now = new Date().toISOString();
	const record: FileRecord = {
		id: fileId,
		filename: safeFilename,
		contentType: contentType ?? null,
		fileSize: mergedBuffer.byteLength,
		status: "ready",
		kind: preview ? "dataset" : "document",
		objectKey,
		preview,
		errorMessage: null,
		createdAt: now,
		updatedAt: now,
	};

	await S3.send(
		new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: objectKey,
			Body: mergedBuffer,
			ContentType: contentType ?? "application/octet-stream",
		}),
	);
	await saveFileRecord(record);
	await rm(getChunkDir(safeFilename), { recursive: true, force: true });

	return record;
};

const cancelUploadByFilename = async (filename: string) => {
	await rm(getChunkDir(filename), { recursive: true, force: true });
};

const readFileRecord = async (fileId: string) => {
	await ensureStorageDirs();

	try {
		const raw = await readFile(getRecordPath(fileId), "utf8");
		const parsed = JSON.parse(raw);
		return FileRecordSchema.parse(parsed);
	} catch (error) {
		throw new Error(
			error instanceof Error
				? error.message
				: `Unable to find file record ${fileId}.`,
		);
	}
};

const getFileRecordStatus = async (fileId: string) => {
	const record = await readFileRecord(fileId);
	return record;
};

const getUploadedFileBytes = async (fileId: string) => {
	if (!BUCKET_NAME) {
		throw new Error("BUCKET_NAME is not configured.");
	}

	const record = await readFileRecord(fileId);
	if (!record.objectKey) {
		throw new Error(
			`Uploaded file ${fileId} does not have a storage object key.`,
		);
	}

	const response = await S3.send(
		new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: record.objectKey,
		}),
	);
	const body = response.Body;
	if (!body) {
		throw new Error(`Uploaded file ${fileId} is empty.`);
	}

	if (!("transformToByteArray" in body)) {
		throw new Error(`Uploaded file ${fileId} cannot be converted to bytes.`);
	}

	const bytes = await body.transformToByteArray();

	return {
		bytes,
		record,
	};
};

const hasChunkFile = async (filename: string, index: number) => {
	try {
		await stat(getChunkPath(filename, index));
		return true;
	} catch {
		return false;
	}
};

const listUploadedChunks = async (filename: string, totalChunks: number) => {
	const uploadedChunks: number[] = [];
	for (let index = 0; index < totalChunks; index += 1) {
		if (await hasChunkFile(filename, index)) {
			uploadedChunks.push(index);
		}
	}
	return uploadedChunks;
};

export {
	cancelUploadByFilename,
	getFileRecordStatus,
	getUploadedFileBytes,
	isDatasetFilename,
	listUploadedChunks,
	mergeUploadedFile,
	readFileRecord,
	saveFileRecord,
	sanitizeFilename,
	writeChunkFile,
};
