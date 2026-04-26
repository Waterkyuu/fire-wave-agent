import type { TypstCompileResult } from "@/lib/typst/compiler";

const DEFAULT_MAX_TYPST_REPAIR_ATTEMPTS = 3;

type RepairTypstInput = {
	attempt: number;
	content: string;
	diagnostics: string;
};

type RepairTypst = (input: RepairTypstInput) => Promise<string>;
type CompileTypst = (content: string) => Promise<TypstCompileResult>;

type CompileAndRepairTypstOptions = {
	compileTypst: CompileTypst;
	repairTypst: RepairTypst;
	maxRepairAttempts?: number;
};

type CompileAndRepairTypstSuccess = {
	ok: true;
	typstContent: string;
	svg: string;
	repairCount: number;
};

type CompileAndRepairTypstFailure = {
	ok: false;
	typstContent: string;
	error: string;
	diagnostics: string;
	repairCount: number;
};

type CompileAndRepairTypstResult =
	| CompileAndRepairTypstSuccess
	| CompileAndRepairTypstFailure;

const compileAndRepairTypst = async (
	initialContent: string,
	options: CompileAndRepairTypstOptions,
): Promise<CompileAndRepairTypstResult> => {
	const maxRepairAttempts =
		options.maxRepairAttempts ?? DEFAULT_MAX_TYPST_REPAIR_ATTEMPTS;
	let currentContent = initialContent;

	for (
		let repairCount = 0;
		repairCount <= maxRepairAttempts;
		repairCount += 1
	) {
		const compileResult = await options.compileTypst(currentContent);

		if (compileResult.ok) {
			return {
				ok: true,
				typstContent: currentContent,
				svg: compileResult.svg,
				repairCount,
			};
		}

		if (repairCount >= maxRepairAttempts) {
			return {
				ok: false,
				typstContent: currentContent,
				error: compileResult.error,
				diagnostics: compileResult.diagnostics,
				repairCount,
			};
		}

		currentContent = await options.repairTypst({
			attempt: repairCount + 1,
			content: currentContent,
			diagnostics: compileResult.diagnostics,
		});
	}

	return {
		ok: false,
		typstContent: currentContent,
		error: "Typst repair loop ended unexpectedly.",
		diagnostics: "Typst repair loop ended unexpectedly.",
		repairCount: maxRepairAttempts,
	};
};

export { DEFAULT_MAX_TYPST_REPAIR_ATTEMPTS, compileAndRepairTypst };
export type {
	CompileAndRepairTypstFailure,
	CompileAndRepairTypstOptions,
	CompileAndRepairTypstResult,
	CompileAndRepairTypstSuccess,
	CompileTypst,
	RepairTypst,
	RepairTypstInput,
};
