"use client";

import { workspaceDatasetAtom } from "@/atoms/chat";
import VirtualList from "@/components/share/virtual-list";
import { Button } from "@/components/ui/button";
import { useDatasetPreview } from "@/services/dataset-panel";
import { useAtomValue } from "jotai";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo } from "react";

const DatasetPanel = memo(() => {
	const dataset = useAtomValue(workspaceDatasetAtom);
	const t = useTranslations("chat");
	const {
		data: datasetPreviewData,
		error: previewError,
		isLoading: isPreviewLoading,
	} = useDatasetPreview(dataset?.fileId);

	if (!dataset) {
		return (
			<div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
				{t("waitingDataset")}
			</div>
		);
	}

	const downloadUrl =
		dataset.downloadUrl ??
		datasetPreviewData?.download_url ??
		`/api/file/${dataset.fileId}/download`;
	const preview = datasetPreviewData?.preview ?? null;
	const previewErrorText = previewError?.message ?? null;

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
								{isPreviewLoading
									? t("waitingDataset")
									: (previewErrorText ?? "-")}
							</p>
						)}
					</div>
					<Button
						size="sm"
						variant="outline"
						className="flex items-center justify-center gap-1"
					>
						<Download className="size-3 md:size-4" />
						<a href={downloadUrl}>{t("downloadArtifact")}</a>
					</Button>
				</div>
			</div>

			{!preview ? (
				<div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
					{isPreviewLoading ? t("waitingDataset") : (previewErrorText ?? "-")}
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
