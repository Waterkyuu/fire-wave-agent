type CodeInterpreterError = {
	name?: string;
	traceback?: string;
	value?: string;
};

type CodeExecutionErrorDetails = {
	error?: CodeInterpreterError;
	stderr?: string[];
	stdout?: string[];
};

const MAX_ERROR_SECTION_CHARS = 6000;

const truncateSection = (text: string): string => {
	if (text.length <= MAX_ERROR_SECTION_CHARS) {
		return text;
	}

	const hiddenCount = text.length - MAX_ERROR_SECTION_CHARS;
	return `${text.slice(0, MAX_ERROR_SECTION_CHARS)}\n...[truncated ${hiddenCount} chars]`;
};

const normalizeLogLines = (lines?: string[]): string =>
	(lines ?? [])
		.map((line) => line.trimEnd())
		.filter((line) => line.length > 0)
		.join("\n");

const normalizeText = (value: unknown): string | undefined => {
	if (typeof value === "string") {
		const text = value.trim();
		return text.length > 0 ? text : undefined;
	}

	return undefined;
};

const formatUnknownError = (error: unknown): string => {
	if (error instanceof Error) {
		const message = normalizeText(error.message);
		if (message) {
			return message;
		}

		return error.name;
	}

	const text = normalizeText(error);
	if (text) {
		return text;
	}

	if (error && typeof error === "object") {
		const errorRecord = error as { message?: unknown };
		const recordMessage = normalizeText(errorRecord.message);
		if (recordMessage) {
			return recordMessage;
		}

		try {
			return JSON.stringify(error, null, 2);
		} catch {
			return "Unknown tool error";
		}
	}

	if (error === null || error === undefined) {
		return "Unknown tool error";
	}

	return String(error);
};

const formatCodeExecutionError = ({
	error,
	stderr,
	stdout,
}: CodeExecutionErrorDetails): string => {
	const sections: string[] = [];
	const errorName = normalizeText(error?.name);
	const errorValue = normalizeText(error?.value);
	const traceback = normalizeText(error?.traceback);
	const stderrText = normalizeLogLines(stderr);
	const stdoutText = normalizeLogLines(stdout);
	const summary = [errorName, errorValue].filter(Boolean).join(": ");

	if (summary.length > 0) {
		sections.push(summary);
	}

	if (stderrText.length > 0) {
		sections.push(`stderr:\n${truncateSection(stderrText)}`);
	}

	if (stdoutText.length > 0) {
		sections.push(`stdout:\n${truncateSection(stdoutText)}`);
	}

	if (traceback?.length) {
		sections.push(`traceback:\n${truncateSection(traceback)}`);
	}

	return sections.length > 0
		? sections.join("\n\n")
		: "Code interpreter execution failed with no additional details.";
};

const formatSandboxOperationError = (
	operation: string,
	error: unknown,
): string => {
	const sections: string[] = [];
	const errorRecord = error as
		| {
				error?: unknown;
				exitCode?: unknown;
				stderr?: unknown;
				stdout?: unknown;
				stack?: unknown;
		  }
		| undefined;
	const header = `Sandbox operation failed: ${operation}`;
	const rawMessage = formatUnknownError(error);
	const exitCode =
		typeof errorRecord?.exitCode === "number"
			? errorRecord.exitCode
			: undefined;
	const commandError = normalizeText(errorRecord?.error);
	const stderr = normalizeText(errorRecord?.stderr);
	const stdout = normalizeText(errorRecord?.stdout);
	const stack = normalizeText(errorRecord?.stack);

	sections.push(
		exitCode !== undefined ? `${header} (exit code ${exitCode})` : header,
	);

	if (rawMessage.length > 0) {
		sections.push(rawMessage);
	}

	if (commandError && commandError !== rawMessage) {
		sections.push(`command error:\n${truncateSection(commandError)}`);
	}

	if (stderr) {
		sections.push(`stderr:\n${truncateSection(stderr)}`);
	}

	if (stdout) {
		sections.push(`stdout:\n${truncateSection(stdout)}`);
	}

	if (stack && !stack.includes(rawMessage)) {
		sections.push(`stack:\n${truncateSection(stack)}`);
	}

	return sections.join("\n\n");
};

export {
	formatUnknownError,
	formatCodeExecutionError,
	formatSandboxOperationError,
};
export type { CodeExecutionErrorDetails, CodeInterpreterError };
