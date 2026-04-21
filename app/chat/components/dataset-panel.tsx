"use client";

import { workspaceDatasetAtom } from "@/atoms/chat";
import VirtualList from "@/components/share/virtual-list";
import { Button } from "@/components/ui/button";
import { zodGet } from "@/services/request";
import { DatasetDataResponseSchema, type DatasetPreview } from "@/types";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { memo, useEffect, useRef, useState } from "react";

const DEFAULT_PREVIEW_ROWS = 200;

const DatasetPanel = memo(() => {
	const dataset = useAtomValue(workspaceDatasetAtom);
	const datasetFileId = dataset?.fileId;
	const t = useTranslations("chat");
	const [preview, setPreview] = useState<DatasetPreview | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [isPreviewLoading, setIsPreviewLoading] = useState(false);
	const [resolvedDownloadUrl, setResolvedDownloadUrl] = useState(
		dataset?.downloadUrl,
	);
	const lastDatasetFileIdRef = useRef<string | null>(dataset?.fileId ?? null);

	useEffect(() => {
		if (!dataset) {
			lastDatasetFileIdRef.current = null;
			setPreview(null);
			setResolvedDownloadUrl(undefined);
			setPreviewError(null);
			return;
		}

		const hasFileChanged = lastDatasetFileIdRef.current !== dataset.fileId;
		lastDatasetFileIdRef.current = dataset.fileId;
		setResolvedDownloadUrl(dataset.downloadUrl);
		setPreviewError(null);

		// Keep locally fetched preview when only metadata changes for the same file.
		if (hasFileChanged) {
			setPreview(null);
		}
	}, [dataset?.downloadUrl, dataset?.fileId]);

	useEffect(() => {
		if (!datasetFileId || preview) {
			return;
		}

		const controller = new AbortController();

		const loadDatasetPreview = async () => {
			setIsPreviewLoading(true);
			try {
				// Load dataset rows on demand to keep persisted chat payload small.
				const payload = await zodGet(
					`/file/${datasetFileId}/dataset?rows=${DEFAULT_PREVIEW_ROWS}`,
					DatasetDataResponseSchema,
					{ signal: controller.signal },
				);

				setPreview(payload.preview);
				setResolvedDownloadUrl(payload.download_url);
				setPreviewError(null);
			} catch (error) {
				if (controller.signal.aborted) {
					return;
				}
				setPreviewError(
					error instanceof Error
						? error.message
						: "Failed to load dataset preview.",
				);
			} finally {
				if (!controller.signal.aborted) {
					setIsPreviewLoading(false);
				}
			}
		};

		loadDatasetPreview();

		return () => {
			controller.abort();
		};
	}, [datasetFileId]);

	if (!dataset) {
		return (
			<div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
				{t("waitingDataset")}
			</div>
		);
	}

	const downloadUrl =
		resolvedDownloadUrl ?? `/api/file/${dataset.fileId}/download`;

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="border-b px-4 py-3">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="font-medium text-sm">{dataset.filename}</p>
						{preview ? (
							<p className="text-muted-foreground text-xs">
								{t("datasetSummary", {
									rows: preview.totalRows,
									columns: preview.totalColumns,
									sheet: preview.activeSheet || "-",
								})}
							</p>
						) : (
							<p className="text-muted-foreground text-xs">
								{isPreviewLoading ? t("waitingDataset") : (previewError ?? "-")}
							</p>
						)}
					</div>
					<Button asChild size="sm" variant="outline">
						<a href={downloadUrl}>{t("downloadArtifact")}</a>
					</Button>
				</div>
			</div>

			{!preview ? (
				<div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
					{isPreviewLoading ? t("waitingDataset") : (previewError ?? "-")}
				</div>
			) : (
				<VirtualList
					columns={preview.columns}
					datasetId={dataset.fileId}
					rows={preview.rows}
				/>
			)}
		</div>
	);
});

export default DatasetPanel;
