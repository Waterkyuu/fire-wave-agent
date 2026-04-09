import type { DatasetPreview } from "./file";

type WorkspaceView = "empty" | "vnc" | "chart" | "dataset";

type WorkspaceChart = {
	chart?: Record<string, unknown>;
	generatedAt: number;
	png?: string;
	title?: string;
	toolCallId: string;
};

type WorkspaceDataset = {
	fileId: string;
	filename: string;
	preview: DatasetPreview;
};

export type { WorkspaceChart, WorkspaceDataset, WorkspaceView };
