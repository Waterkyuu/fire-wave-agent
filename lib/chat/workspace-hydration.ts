import type {
	WorkspaceChart,
	WorkspaceDataset,
	WorkspaceFile,
	WorkspaceView,
} from "@/types";
import type { ChatAttachment, ChatMessageMetadata } from "@/types/chat";
import type { UIMessage } from "ai";

type WorkspaceArtifactCategory = "data" | "chart" | "report";

type WorkspaceRoundArtifact = {
	id: string;
	category: WorkspaceArtifactCategory;
	createdAt: number;
	label: string;
	fileId?: string;
	filename?: string;
	downloadUrl?: string;
	extension?: string;
	preview?: WorkspaceDataset["preview"];
	chart?: Record<string, unknown>;
	png?: string;
	title?: string;
	toolCallId?: string;
};

type WorkspaceRoundArtifacts = {
	data: WorkspaceRoundArtifact[];
	chart: WorkspaceRoundArtifact[];
	report: WorkspaceRoundArtifact[];
};

type WorkspaceRoundArtifactsByMessage = Record<string, WorkspaceRoundArtifacts>;

type WorkspaceSnapshot = {
	vncUrl: string;
	view: WorkspaceView;
	chart: WorkspaceChart | null;
	dataset: WorkspaceDataset | null;
	file: WorkspaceFile | null;
	typstContent: string;
};

const EMPTY_WORKSPACE_SNAPSHOT: WorkspaceSnapshot = {
	vncUrl: "",
	view: "empty",
	chart: null,
	dataset: null,
	file: null,
	typstContent: "",
};

const EMPTY_WORKSPACE_ROUND_ARTIFACTS: WorkspaceRoundArtifacts = {
	data: [],
	chart: [],
	report: [],
};

const cloneWorkspaceSnapshot = (
	snapshot: WorkspaceSnapshot,
): WorkspaceSnapshot => ({
	...snapshot,
	chart: snapshot.chart ? { ...snapshot.chart } : null,
	dataset: snapshot.dataset ? { ...snapshot.dataset } : null,
	file: snapshot.file ? { ...snapshot.file } : null,
});

const cloneWorkspaceRoundArtifacts = (
	artifacts: WorkspaceRoundArtifacts,
): WorkspaceRoundArtifacts => ({
	data: [...artifacts.data],
	chart: [...artifacts.chart],
	report: [...artifacts.report],
});

const hasWorkspaceRoundArtifacts = (
	artifacts: WorkspaceRoundArtifacts,
): boolean =>
	artifacts.data.length > 0 ||
	artifacts.chart.length > 0 ||
	artifacts.report.length > 0;

const getFileExtension = (filename: string): string => {
	const suffix = filename.split(".").pop();
	return suffix ? suffix.toUpperCase() : "FILE";
};

const getFileDownloadUrl = (
	fileId?: string,
	downloadUrl?: string,
): string | undefined => {
	if (typeof downloadUrl === "string" && downloadUrl.length > 0) {
		return downloadUrl;
	}
	if (typeof fileId === "string" && fileId.length > 0) {
		return `/api/file/${fileId}/download`;
	}
	return undefined;
};

const resolvePreviewAttachment = (
	attachments: ChatAttachment[] | undefined,
): WorkspaceDataset | null => {
	if (!attachments || attachments.length === 0) {
		return null;
	}

	const previewAttachment = attachments.findLast(
		(attachment) => attachment.preview,
	);
	if (!previewAttachment?.preview) {
		return null;
	}

	return {
		fileId: previewAttachment.fileId,
		filename: previewAttachment.filename,
		preview: previewAttachment.preview,
	};
};

const inferArtifactCategory = (
	kind: unknown,
	filename: string | undefined,
	extension: string | undefined,
): WorkspaceArtifactCategory | null => {
	if (kind === "dataset") {
		return "data";
	}
	if (kind === "document") {
		return "report";
	}
	if (kind === "chart") {
		return "chart";
	}

	const normalizedExtension = extension?.toLowerCase() ?? "";
	const normalizedFilenameExtension =
		filename?.split(".").pop()?.toLowerCase() ?? "";
	const fileExtension = normalizedExtension || normalizedFilenameExtension;

	if (["png", "jpg", "jpeg", "svg", "webp"].includes(fileExtension)) {
		return "chart";
	}
	if (["pdf", "md", "txt", "typ", "docx"].includes(fileExtension)) {
		return "report";
	}

	return null;
};

const pushRoundArtifact = (
	artifacts: WorkspaceRoundArtifacts,
	artifact: WorkspaceRoundArtifact,
) => {
	const targetList = artifacts[artifact.category];
	const isDuplicated = targetList.some((currentArtifact) => {
		if (
			artifact.fileId &&
			currentArtifact.fileId &&
			artifact.fileId === currentArtifact.fileId
		) {
			return true;
		}
		if (
			artifact.toolCallId &&
			currentArtifact.toolCallId &&
			artifact.toolCallId === currentArtifact.toolCallId
		) {
			return true;
		}
		return (
			artifact.filename &&
			currentArtifact.filename &&
			artifact.filename === currentArtifact.filename &&
			artifact.title === currentArtifact.title
		);
	});

	if (!isDuplicated) {
		targetList.push(artifact);
	}
};

const deriveRoundArtifactsFromMessage = (
	message: UIMessage,
): WorkspaceRoundArtifacts => {
	const artifacts = cloneWorkspaceRoundArtifacts(
		EMPTY_WORKSPACE_ROUND_ARTIFACTS,
	);

	if (message.role !== "assistant") {
		return artifacts;
	}

	let order = 0;
	const nextCreatedAt = () => {
		order += 1;
		return order;
	};

	for (const part of message.parts) {
		if (part.type === "artifact") {
			const partRecord = part as Record<string, unknown>;
			const fileId =
				typeof partRecord.fileId === "string" ? partRecord.fileId : undefined;
			const filename =
				typeof partRecord.filename === "string"
					? partRecord.filename
					: undefined;
			const extension =
				typeof partRecord.extension === "string"
					? partRecord.extension
					: filename
						? getFileExtension(filename)
						: undefined;
			const explicitCategory =
				typeof partRecord.category === "string"
					? (partRecord.category as WorkspaceArtifactCategory)
					: undefined;
			const inferredCategory =
				explicitCategory ??
				inferArtifactCategory(partRecord.kind, filename, extension);
			if (!inferredCategory) {
				continue;
			}

			const createdAt = nextCreatedAt();
			pushRoundArtifact(artifacts, {
				id: `${message.id}-artifact-${createdAt}`,
				category: inferredCategory,
				createdAt,
				fileId,
				filename,
				extension,
				downloadUrl: getFileDownloadUrl(
					fileId,
					typeof partRecord.downloadUrl === "string"
						? partRecord.downloadUrl
						: undefined,
				),
				preview: partRecord.preview as WorkspaceDataset["preview"] | undefined,
				label: filename ?? inferredCategory,
				title:
					typeof partRecord.title === "string"
						? partRecord.title
						: (filename ?? inferredCategory),
				toolCallId:
					typeof partRecord.toolCallId === "string"
						? partRecord.toolCallId
						: undefined,
			});
			continue;
		}

		if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
			continue;
		}

		const partRecord = part as Record<string, unknown>;
		if (partRecord.state !== "output-available") {
			continue;
		}

		const toolName = part.type.slice(5);
		const toolCallId =
			typeof partRecord.toolCallId === "string"
				? partRecord.toolCallId
				: undefined;
		const output = partRecord.output as Record<string, unknown> | undefined;
		if (!output) {
			continue;
		}

		if (toolName === "codeInterpreter") {
			const results = Array.isArray(output.results) ? output.results : [];
			for (const result of results) {
				if (!result || typeof result !== "object") {
					continue;
				}

				const resultRecord = result as Record<string, unknown>;
				const hasChartPayload =
					(typeof resultRecord.chart === "object" &&
						resultRecord.chart !== null) ||
					typeof resultRecord.png === "string";
				if (!hasChartPayload) {
					continue;
				}

				const createdAt = nextCreatedAt();
				const chartPayload =
					typeof resultRecord.chart === "object" && resultRecord.chart !== null
						? (resultRecord.chart as Record<string, unknown>)
						: undefined;
				const title =
					typeof chartPayload?.title === "string"
						? chartPayload.title
						: typeof resultRecord.text === "string"
							? resultRecord.text
							: "Generated chart";

				pushRoundArtifact(artifacts, {
					id: `${message.id}-chart-${createdAt}`,
					category: "chart",
					createdAt,
					label: title,
					title,
					chart: chartPayload,
					png:
						typeof resultRecord.png === "string" ? resultRecord.png : undefined,
					toolCallId,
				});
			}
			continue;
		}

		if (toolName === "persistLatestChart") {
			const downloadUrl =
				typeof output.downloadUrl === "string" ? output.downloadUrl : undefined;
			const fileId =
				typeof output.fileId === "string" ? output.fileId : undefined;
			const filename =
				typeof output.filename === "string" ? output.filename : undefined;
			if (!downloadUrl && !fileId && !filename) {
				continue;
			}

			const latestChart =
				artifacts.chart.length > 0
					? artifacts.chart[artifacts.chart.length - 1]
					: undefined;
			if (latestChart) {
				latestChart.downloadUrl = getFileDownloadUrl(fileId, downloadUrl);
				latestChart.fileId = fileId ?? latestChart.fileId;
				latestChart.filename = filename ?? latestChart.filename;
				latestChart.extension = filename
					? getFileExtension(filename)
					: latestChart.extension;
				latestChart.label = filename ?? latestChart.label;
				continue;
			}

			const createdAt = nextCreatedAt();
			pushRoundArtifact(artifacts, {
				id: `${message.id}-chart-file-${createdAt}`,
				category: "chart",
				createdAt,
				label: filename ?? "Generated chart",
				fileId,
				filename,
				extension: filename ? getFileExtension(filename) : undefined,
				downloadUrl: getFileDownloadUrl(fileId, downloadUrl),
				toolCallId,
			});
			continue;
		}

		if (toolName === "persistCodeFile") {
			const fileId =
				typeof output.fileId === "string" ? output.fileId : undefined;
			const filename =
				typeof output.filename === "string" ? output.filename : undefined;
			const kind = output.kind;
			const preview = output.preview as WorkspaceDataset["preview"] | undefined;

			if (!fileId || !filename) {
				continue;
			}

			const inferredCategory = inferArtifactCategory(
				kind,
				filename,
				getFileExtension(filename),
			);
			if (!inferredCategory) {
				continue;
			}

			const createdAt = nextCreatedAt();
			pushRoundArtifact(artifacts, {
				id: `${message.id}-${inferredCategory}-${createdAt}`,
				category: inferredCategory,
				createdAt,
				label: filename,
				fileId,
				filename,
				extension: getFileExtension(filename),
				preview,
				downloadUrl: getFileDownloadUrl(fileId),
				toolCallId,
			});
		}
	}

	return artifacts;
};

const deriveRoundArtifactsByMessage = (
	messages: UIMessage[],
): WorkspaceRoundArtifactsByMessage => {
	const byMessage: WorkspaceRoundArtifactsByMessage = {};

	for (const message of messages) {
		const artifacts = deriveRoundArtifactsFromMessage(message);
		if (!hasWorkspaceRoundArtifacts(artifacts)) {
			continue;
		}

		byMessage[message.id] = artifacts;
	}

	return byMessage;
};

const deriveWorkspaceSnapshotFromMessages = (
	messages: UIMessage[],
): WorkspaceSnapshot => {
	const snapshot = cloneWorkspaceSnapshot(EMPTY_WORKSPACE_SNAPSHOT);
	let updateOrder = 0;
	let latestViewOrder = -1;

	const markViewUpdated = (view: WorkspaceView) => {
		updateOrder += 1;
		latestViewOrder = updateOrder;
		snapshot.view = view;
	};

	for (const message of messages) {
		const metadata = message.metadata as ChatMessageMetadata | undefined;
		const datasetFromAttachment = resolvePreviewAttachment(
			metadata?.attachments,
		);
		if (datasetFromAttachment) {
			snapshot.dataset = datasetFromAttachment;
			markViewUpdated("dataset");
		}

		if (message.role !== "assistant") {
			continue;
		}

		const roundArtifacts = deriveRoundArtifactsFromMessage(message);
		const roundEntries = [
			...roundArtifacts.data,
			...roundArtifacts.chart,
			...roundArtifacts.report,
		].sort((left, right) => left.createdAt - right.createdAt);

		for (const artifact of roundEntries) {
			if (artifact.category === "data") {
				if (artifact.preview && artifact.fileId && artifact.filename) {
					snapshot.dataset = {
						fileId: artifact.fileId,
						filename: artifact.filename,
						preview: artifact.preview,
					};
					markViewUpdated("dataset");
					continue;
				}

				if (artifact.fileId && artifact.filename) {
					snapshot.file = {
						fileId: artifact.fileId,
						filename: artifact.filename,
						extension:
							artifact.extension ?? getFileExtension(artifact.filename),
						downloadUrl: getFileDownloadUrl(
							artifact.fileId,
							artifact.downloadUrl,
						),
					};
					markViewUpdated("file");
				}
				continue;
			}

			if (artifact.category === "chart") {
				snapshot.chart = {
					chart: artifact.chart,
					downloadUrl: artifact.downloadUrl,
					fileId: artifact.fileId,
					filename: artifact.filename,
					generatedAt: artifact.createdAt,
					png: artifact.png,
					title: artifact.title ?? artifact.label,
					toolCallId: artifact.toolCallId ?? artifact.id,
				};
				markViewUpdated("chart");
				continue;
			}

			if (artifact.category === "report") {
				if (!artifact.fileId || !artifact.filename) {
					continue;
				}
				snapshot.file = {
					fileId: artifact.fileId,
					filename: artifact.filename,
					extension: artifact.extension ?? getFileExtension(artifact.filename),
					downloadUrl: getFileDownloadUrl(
						artifact.fileId,
						artifact.downloadUrl,
					),
				};
				markViewUpdated("file");
			}
		}

		for (const part of message.parts) {
			if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
				continue;
			}

			const partRecord = part as Record<string, unknown>;
			if (partRecord.state !== "output-available") {
				continue;
			}

			const toolName = part.type.slice(5);
			if (toolName !== "createSandbox") {
				continue;
			}

			const output = partRecord.output as Record<string, unknown> | undefined;
			const vncUrl = output?.vncUrl;
			if (typeof vncUrl === "string" && vncUrl.length > 0) {
				snapshot.vncUrl = vncUrl;
				if (latestViewOrder < 0) {
					markViewUpdated("vnc");
				}
			}
		}
	}

	if (latestViewOrder < 0) {
		snapshot.view = "empty";
	}

	return snapshot;
};

export {
	EMPTY_WORKSPACE_SNAPSHOT,
	EMPTY_WORKSPACE_ROUND_ARTIFACTS,
	cloneWorkspaceSnapshot,
	cloneWorkspaceRoundArtifacts,
	deriveRoundArtifactsByMessage,
	deriveRoundArtifactsFromMessage,
	deriveWorkspaceSnapshotFromMessages,
	getFileDownloadUrl,
	getFileExtension,
	hasWorkspaceRoundArtifacts,
};
export type {
	WorkspaceSnapshot,
	WorkspaceArtifactCategory,
	WorkspaceRoundArtifact,
	WorkspaceRoundArtifacts,
	WorkspaceRoundArtifactsByMessage,
};
