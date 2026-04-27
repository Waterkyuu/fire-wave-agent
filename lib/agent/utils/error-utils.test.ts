import {
	formatCodeExecutionError,
	formatSandboxOperationError,
	formatUnknownError,
} from "@/lib/agent/utils/error-utils";

describe("formatUnknownError", () => {
	it("returns message for Error instances", () => {
		const output = formatUnknownError(new Error("boom"));
		expect(output).toBe("boom");
	});

	it("serializes plain objects", () => {
		const output = formatUnknownError({ code: 500, reason: "failed" });
		expect(output).toContain('"code": 500');
		expect(output).toContain('"reason": "failed"');
	});
});

describe("formatCodeExecutionError", () => {
	it("includes error summary and logs", () => {
		const output = formatCodeExecutionError({
			error: {
				name: "RuntimeError",
				traceback: "Traceback line",
				value: "exit status 1",
			},
			stderr: ["ModuleNotFoundError: No module named pandas"],
			stdout: ["starting..."],
		});

		expect(output).toContain("RuntimeError: exit status 1");
		expect(output).toContain("stderr:");
		expect(output).toContain("ModuleNotFoundError");
		expect(output).toContain("stdout:");
		expect(output).toContain("starting...");
		expect(output).toContain("traceback:");
	});
});

describe("formatSandboxOperationError", () => {
	it("includes command exit details for command-like errors", () => {
		const output = formatSandboxOperationError("prepare directories", {
			error: "exit status 1",
			exitCode: 1,
			stderr: "mkdir: cannot create directory '/mnt': Permission denied",
			stdout: "",
		});

		expect(output).toContain("prepare directories");
		expect(output).toContain("exit code 1");
		expect(output).toContain("stderr:");
		expect(output).toContain("Permission denied");
	});
});
