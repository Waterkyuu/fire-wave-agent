"use client";

import { workspaceFileAtom } from "@/atoms/chat";
import FileCard from "@/components/share/file-card";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/file/file";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { memo } from "react";

const FileInfoPanel = memo(() => {
	const file = useAtomValue(workspaceFileAtom);
	const t = useTranslations("chat");

	if (!file) {
		return (
			<div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
				{t("workspaceEmpty")}
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="border-b px-4 py-3">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="font-medium text-sm">{file.filename}</p>
						<p className="text-muted-foreground text-xs">
							{`${file.extension}${file.fileSize ? ` · ${formatFileSize(file.fileSize)}` : ""}`}
						</p>
					</div>
					{file.downloadUrl && (
						<Button asChild size="sm" variant="outline">
							<a href={file.downloadUrl}>{t("downloadArtifact")}</a>
						</Button>
					)}
				</div>
			</div>
			<div className="flex flex-1 items-start p-4">
				<FileCard
					className="w-full max-w-sm"
					extension={file.extension}
					fileName={file.filename}
					fileSize={file.fileSize}
				/>
			</div>
		</div>
	);
});

export default FileInfoPanel;
