import { $typst } from "@myriaddreamin/typst.ts";
import { TypstSnippet } from "@myriaddreamin/typst.ts/contrib/snippet";

type TypstFontAsset = "text" | "cjk" | "emoji";

type TypstCompileSuccess = {
	ok: true;
	svg: string;
};

type TypstCompileFailure = {
	ok: false;
	error: string;
	diagnostics: string;
};

type TypstCompileResult = TypstCompileSuccess | TypstCompileFailure;

type TypstSvgCompiler = {
	svg: (input: { mainContent: string }) => Promise<string | undefined>;
};

type TypstFontProvider = ReturnType<typeof TypstSnippet.preloadFontAssets>;

type TypstFontConfigurableCompiler = {
	use: (...providers: TypstFontProvider[]) => void;
};

type CreateTypstFontProvider = (options: {
	assets: TypstFontAsset[];
}) => TypstFontProvider;

const BACKEND_TYPST_FONT_ASSETS: TypstFontAsset[] = ["text", "cjk", "emoji"];

const formatTypstError = (error: unknown): string => {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message.trim();
	}

	return String(error).trim();
};

const configureTypstCompilerFonts = (
	compiler: TypstFontConfigurableCompiler,
	createFontProvider: CreateTypstFontProvider = TypstSnippet.preloadFontAssets,
): void => {
	compiler.use(
		createFontProvider({
			assets: BACKEND_TYPST_FONT_ASSETS,
		}),
	);
};

const createTypstCompiler =
	(compiler: TypstSvgCompiler) =>
	async (content: string): Promise<TypstCompileResult> => {
		try {
			const svg = await compiler.svg({
				mainContent: content,
			});

			if (!svg) {
				return {
					ok: false,
					error: "Typst compiler returned an empty SVG.",
					diagnostics: "Typst compiler returned an empty SVG.",
				};
			}

			return {
				ok: true,
				svg,
			};
		} catch (error) {
			const message = formatTypstError(error);

			return {
				ok: false,
				error: message,
				diagnostics: message,
			};
		}
	};

configureTypstCompilerFonts($typst);

const compileTypst = createTypstCompiler($typst);

export {
	BACKEND_TYPST_FONT_ASSETS,
	compileTypst,
	configureTypstCompilerFonts,
	createTypstCompiler,
	formatTypstError,
};
export type {
	TypstCompileFailure,
	TypstCompileResult,
	TypstCompileSuccess,
	TypstSvgCompiler,
};
