import { basename } from "node:path/posix";
import { Sandbox as CodeSandbox } from "@e2b/code-interpreter";
import { Sandbox as DesktopSandbox } from "@e2b/desktop";
import { getUploadedFileBytes, storeFileRecordFromBytes } from "./file-store";

const E2B_API_KEY = process.env.E2B_API_KEY;

if (!E2B_API_KEY) {
	console.warn(
		"[E2B] E2B_API_KEY is not set. Sandbox creation will fail. Set it in .env.local",
	);
}

const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000;
const CODE_DATA_DIR = "/home/user/data";

type ManagedDesktopSandbox = {
	sandbox: DesktopSandbox;
	sandboxId: string;
	vncUrl: string;
	createdAt: number;
	timeoutHandle: ReturnType<typeof setTimeout>;
};

type ManagedCodeSandbox = {
	sandbox: CodeSandbox;
	sandboxId: string;
	createdAt: number;
	lastChartArtifact?: {
		png: string;
		title?: string;
	};
	syncedFileIds: Set<string>;
	timeoutHandle: ReturnType<typeof setTimeout>;
};

const desktopStore = new Map<string, ManagedDesktopSandbox>();
const codeStore = new Map<string, ManagedCodeSandbox>();

const getLatestDesktop = (): ManagedDesktopSandbox | undefined => {
	if (desktopStore.size === 0) return undefined;
	const entries = [...desktopStore.values()];
	return entries[entries.length - 1];
};

const getLatestCode = (): ManagedCodeSandbox | undefined => {
	if (codeStore.size === 0) return undefined;
	const entries = [...codeStore.values()];
	return entries[entries.length - 1];
};

const scheduleDesktopCleanup = (sandboxId: string) => {
	const entry = desktopStore.get(sandboxId);
	if (!entry) return;

	entry.timeoutHandle = setTimeout(async () => {
		try {
			await entry.sandbox.kill();
		} catch {
			// sandbox may already be dead
		}
		desktopStore.delete(sandboxId);
	}, SANDBOX_TIMEOUT_MS);
};

const scheduleCodeCleanup = (sandboxId: string) => {
	const entry = codeStore.get(sandboxId);
	if (!entry) return;

	entry.timeoutHandle = setTimeout(async () => {
		try {
			await entry.sandbox.kill();
		} catch {
			// sandbox may already be dead
		}
		codeStore.delete(sandboxId);
	}, SANDBOX_TIMEOUT_MS);
};

const createDesktopSandbox = async (
	opts?: Record<string, unknown>,
): Promise<{ sandboxId: string; vncUrl: string }> => {
	const sandbox = await DesktopSandbox.create({
		apiKey: E2B_API_KEY,
		resolution: [1024, 720],
		dpi: 96,
		timeoutMs: SANDBOX_TIMEOUT_MS,
		...(opts || {}),
	});

	const sandboxId = sandbox.sandboxId;

	await sandbox.stream.start({ requireAuth: true });
	const authKey = sandbox.stream.getAuthKey();
	const vncUrl = sandbox.stream.getUrl({
		authKey,
		autoConnect: true,
		resize: "remote",
	});

	desktopStore.set(sandboxId, {
		sandbox,
		sandboxId,
		vncUrl,
		createdAt: Date.now(),
		timeoutHandle: undefined as unknown as ReturnType<typeof setTimeout>,
	});

	scheduleDesktopCleanup(sandboxId);

	return { sandboxId, vncUrl };
};

const createCodeSandbox = async (
	opts?: Record<string, unknown>,
): Promise<{ sandboxId: string }> => {
	const sandbox = await CodeSandbox.create({
		apiKey: E2B_API_KEY,
		timeoutMs: SANDBOX_TIMEOUT_MS,
		...(opts || {}),
	});

	const sandboxId = sandbox.sandboxId;

	codeStore.set(sandboxId, {
		sandbox,
		sandboxId,
		createdAt: Date.now(),
		lastChartArtifact: undefined,
		syncedFileIds: new Set<string>(),
		timeoutHandle: undefined as unknown as ReturnType<typeof setTimeout>,
	});

	scheduleCodeCleanup(sandboxId);

	return { sandboxId };
};

const getDesktopSandbox = (sandboxId?: string): DesktopSandbox | undefined => {
	if (sandboxId) return desktopStore.get(sandboxId)?.sandbox;
	return getLatestDesktop()?.sandbox;
};

const getCodeSandbox = (sandboxId?: string): CodeSandbox | undefined => {
	if (sandboxId) return codeStore.get(sandboxId)?.sandbox;
	return getLatestCode()?.sandbox;
};

const getCodeSandboxEntry = (
	sandboxId?: string,
): ManagedCodeSandbox | undefined => {
	if (sandboxId) {
		return codeStore.get(sandboxId);
	}

	return getLatestCode();
};

const syncFilesToCodeSandbox = async (
	fileIds: string[],
	sandboxId?: string,
): Promise<void> => {
	if (fileIds.length === 0) {
		return;
	}

	let entry = getCodeSandboxEntry(sandboxId);
	if (!entry) {
		await createCodeSandbox();
		entry = getCodeSandboxEntry();
	}
	if (!entry) {
		throw new Error("No code sandbox available. Create a code sandbox first.");
	}

	await entry.sandbox.commands.run(`mkdir -p ${CODE_DATA_DIR}`);

	for (const fileId of fileIds) {
		if (entry.syncedFileIds.has(fileId)) {
			continue;
		}

		const { bytes, record } = await getUploadedFileBytes(fileId);
		const fileBuffer = new ArrayBuffer(bytes.byteLength);
		new Uint8Array(fileBuffer).set(bytes);
		await entry.sandbox.files.write(
			`${CODE_DATA_DIR}/${record.filename}`,
			fileBuffer,
		);
		entry.syncedFileIds.add(fileId);
	}
};

const executeCommand = async (
	cmd: string,
	sandboxId?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
	const sb = getDesktopSandbox(sandboxId);
	if (!sb)
		throw new Error("No desktop sandbox available. Create a sandbox first.");

	const result = await sb.commands.run(cmd);
	return {
		stdout: result.stdout,
		stderr: result.stderr,
		exitCode: result.exitCode,
	};
};

const persistCodeFile = async ({
	contentType,
	filename,
	filePath,
	kind,
	sandboxId,
}: {
	contentType?: string;
	filename?: string;
	filePath: string;
	kind?: "dataset" | "document";
	sandboxId?: string;
}) => {
	const entry = getCodeSandboxEntry(sandboxId);
	if (!entry) {
		throw new Error("No code sandbox available. Create a code sandbox first.");
	}

	const fileBytes = (await entry.sandbox.files.read(filePath, {
		format: "bytes",
	})) as Uint8Array;

	return storeFileRecordFromBytes({
		bytes: fileBytes,
		contentType,
		filename: filename ?? basename(filePath),
		kind,
	});
};

const persistLatestChart = async ({
	contentType = "image/png",
	filename = "chart.png",
	sandboxId,
}: {
	contentType?: string;
	filename?: string;
	sandboxId?: string;
}) => {
	const entry = getCodeSandboxEntry(sandboxId);
	if (!entry?.lastChartArtifact?.png) {
		throw new Error("No chart artifact available. Generate a chart first.");
	}

	return storeFileRecordFromBytes({
		bytes: Buffer.from(entry.lastChartArtifact.png, "base64"),
		contentType,
		filename,
		kind: "document",
	});
};

const executeCode = async (
	code: string,
	sandboxId?: string,
	fileIds: string[] = [],
): Promise<{
	text?: string;
	results: Array<{
		chart?: Record<string, unknown>;
		data?: Record<string, unknown>;
		jpeg?: string;
		json?: string;
		latex?: string;
		markdown?: string;
		pdf?: string;
		svg?: string;
		text?: string;
		html?: string;
		png?: string;
	}>;
	stdout: string[];
	stderr: string[];
	error?: { name: string; value: string; traceback: string };
}> => {
	let sb = getCodeSandbox(sandboxId);
	if (!sb) {
		await createCodeSandbox();
		sb = getCodeSandbox();
	}
	if (!sb)
		throw new Error("No code sandbox available. Create a code sandbox first.");

	await syncFilesToCodeSandbox(fileIds, sandboxId);

	const execution = await sb.runCode(code);
	const entry = getCodeSandboxEntry(sandboxId);
	const latestChartResult = execution.results.find((result) => result.png);

	if (entry) {
		entry.lastChartArtifact = latestChartResult?.png
			? {
					png: latestChartResult.png,
					title:
						typeof latestChartResult.chart?.title === "string"
							? latestChartResult.chart.title
							: latestChartResult.text,
				}
			: entry.lastChartArtifact;
	}

	return {
		text: execution.text,
		results: execution.results.map((r) => ({
			chart: r.chart as Record<string, unknown> | undefined,
			data: r.data,
			text: r.text,
			html: r.html,
			jpeg: r.jpeg,
			json: r.json,
			latex: r.latex,
			markdown: r.markdown,
			pdf: r.pdf,
			png: r.png,
			svg: r.svg,
		})),
		stdout: execution.logs.stdout,
		stderr: execution.logs.stderr,
		error: execution.error
			? {
					name: execution.error.name,
					value: execution.error.value,
					traceback: execution.error.traceback,
				}
			: undefined,
	};
};

const navigateBrowser = async (
	url: string,
	sandboxId?: string,
): Promise<{ url: string; title: string }> => {
	const sb = getDesktopSandbox(sandboxId);
	if (!sb)
		throw new Error(
			"No desktop sandbox available. You MUST call createDesktopSandbox first.",
		);

	await sb.open(url);
	await sb.wait(3000);

	return { url, title: `Navigated to ${url}` };
};

const searchWeb = async (
	query: string,
	sandboxId?: string,
): Promise<{
	query: string;
	results: Array<{ title: string; snippet: string }>;
}> => {
	const sb = getDesktopSandbox(sandboxId);

	if (!sb)
		throw new Error(
			"No desktop sandbox available. You MUST call createDesktopSandbox first.",
		);

	await sb.launch(
		"google-chrome",
		`https://www.google.com/search?q=${encodeURIComponent(query)}`,
	);
	await sb.wait(5000);

	const screenshot = await sb.screenshot("bytes");
	const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

	return {
		query,
		results: [
			{
				title: `Searched for: ${query}`,
				snippet: `Browser opened at ${searchUrl}. Screenshot captured (${screenshot.byteLength} bytes). View the VNC stream for visual results.`,
			},
		],
	};
};

const cleanup = async (sandboxId?: string) => {
	if (sandboxId) {
		const desktopEntry = desktopStore.get(sandboxId);
		if (desktopEntry) {
			clearTimeout(desktopEntry.timeoutHandle);
			await desktopEntry.sandbox.kill();
			desktopStore.delete(sandboxId);
		}

		const codeEntry = codeStore.get(sandboxId);
		if (codeEntry) {
			clearTimeout(codeEntry.timeoutHandle);
			await codeEntry.sandbox.kill();
			codeStore.delete(sandboxId);
		}
		return;
	}

	for (const [id, entry] of desktopStore) {
		clearTimeout(entry.timeoutHandle);
		try {
			await entry.sandbox.kill();
		} catch {
			// ignore
		}
		desktopStore.delete(id);
	}

	for (const [id, entry] of codeStore) {
		clearTimeout(entry.timeoutHandle);
		try {
			await entry.sandbox.kill();
		} catch {
			// ignore
		}
		codeStore.delete(id);
	}
};

export {
	createDesktopSandbox,
	createCodeSandbox,
	getDesktopSandbox,
	getCodeSandbox,
	executeCommand,
	executeCode,
	navigateBrowser,
	persistCodeFile,
	persistLatestChart,
	searchWeb,
	syncFilesToCodeSandbox,
	cleanup,
};
