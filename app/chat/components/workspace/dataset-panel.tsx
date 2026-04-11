"use client";

import { workspaceDatasetAtom } from "@/atoms/chat";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { memo } from "react";

const DatasetPanel = memo(() => {
	const dataset = useAtomValue(workspaceDatasetAtom);
	const t = useTranslations("chat");

	if (!dataset?.preview) {
		return (
			<div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
				{t("waitingDataset")}
			</div>
		);
	}

	const { preview } = dataset;

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="border-b px-4 py-3">
				<p className="font-medium text-sm">{dataset.filename}</p>
				<p className="text-muted-foreground text-xs">
					{t("datasetSummary", {
						rows: preview.totalRows,
						columns: preview.totalColumns,
						sheet: preview.activeSheet || "-",
					})}
				</p>
			</div>
			<div className="min-h-0 flex-1 overflow-auto">
				<table className="min-w-full border-collapse text-left text-xs sm:text-sm">
					<thead className="sticky top-0 bg-background">
						<tr className="border-b">
							{preview.columns.map((column) => (
								<th
									key={column}
									className="whitespace-nowrap px-3 py-2 font-medium"
								>
									{column}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{preview.rows.map((row, rowIndex) => (
							<tr key={`${dataset.fileId}-${rowIndex}`} className="border-b">
								{row.map((cell, cellIndex) => (
									<td
										key={`${dataset.fileId}-${rowIndex}-${cellIndex}`}
										className="max-w-56 truncate px-3 py-2 text-muted-foreground"
										title={cell}
									>
										{cell}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
});

export default DatasetPanel;
