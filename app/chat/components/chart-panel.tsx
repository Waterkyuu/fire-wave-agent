"use client";

import { workspaceChartAtom } from "@/atoms/chat";
import { Button } from "@/components/ui/button";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { memo } from "react";

const ChartPanel = memo(() => {
	const chart = useAtomValue(workspaceChartAtom);
	const t = useTranslations("chat");
	// Prefer URL-based rendering to avoid persisting large base64 payloads.
	const imageSrc = chart?.downloadUrl ?? "";

	if (!chart) {
		return (
			<div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
				{t("waitingChart")}
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="border-b px-4 py-3">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="font-medium text-sm">
							{chart.title || t("chartViewer")}
						</p>
						<p className="text-muted-foreground text-xs">
							{t("chartGeneratedAt", {
								time: new Date(chart.generatedAt).toLocaleTimeString(),
							})}
						</p>
					</div>
					{chart.downloadUrl && (
						<Button asChild size="sm" variant="outline">
							<a href={chart.downloadUrl}>{t("downloadArtifact")}</a>
						</Button>
					)}
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-auto p-4">
				{imageSrc ? (
					<img
						src={imageSrc}
						alt={chart.title || t("chartViewer")}
						className="mx-auto max-h-full rounded-xl border bg-white shadow-sm"
					/>
				) : (
					<pre className="overflow-auto rounded-xl border bg-background p-4 text-xs">
						{JSON.stringify(chart.chart, null, 2)}
					</pre>
				)}
			</div>
		</div>
	);
});

export default ChartPanel;
