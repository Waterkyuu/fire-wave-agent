import type { FileRecord } from "@/types";

const getSandboxFilePath = (filename: string) => `/home/user/data/${filename}`;

const formatSandboxAttachedFiles = (attachedFiles: FileRecord[]) => {
	if (attachedFiles.length === 0) {
		return "- none";
	}

	return attachedFiles
		.map(
			({ filename, kind }) =>
				`- ${filename} -> ${kind ?? "document"} -> sandbox path: ${getSandboxFilePath(filename)}`,
		)
		.join("\n");
};

export { getSandboxFilePath, formatSandboxAttachedFiles };
