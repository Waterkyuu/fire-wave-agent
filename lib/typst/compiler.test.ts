/**
 * @jest-environment node
 */

import { configureTypstCompilerFonts, createTypstCompiler } from "./compiler";

describe("compileTypst", () => {
	it("configures backend Typst compiler with CJK font assets", () => {
		const provider = { key: "font-assets" };
		const createFontProvider = jest.fn(() => provider);
		const compiler = {
			use: jest.fn(),
		};

		configureTypstCompilerFonts(compiler, createFontProvider);

		expect(createFontProvider).toHaveBeenCalledWith({
			assets: ["text", "cjk", "emoji"],
		});
		expect(compiler.use).toHaveBeenCalledWith(provider);
	});

	it("compiles valid Typst content to SVG", async () => {
		const compileTypst = createTypstCompiler({
			svg: async ({ mainContent }) => `<svg>${mainContent}</svg>`,
		});

		const result = await compileTypst("= Hello\n\nThis is *Typst*.");

		expect(result.ok).toBe(true);
		if (!result.ok) {
			throw new Error(result.error);
		}
		expect(result.svg).toContain("<svg");
	});

	it("returns diagnostics for invalid Typst content", async () => {
		const compileTypst = createTypstCompiler({
			svg: async () => {
				throw new Error("unclosed delimiter");
			},
		});

		const result = await compileTypst("= Broken\n\n#unknown-function(");

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("Expected Typst compilation to fail.");
		}
		expect(result.error).toContain("unclosed delimiter");
		expect(result.diagnostics).toContain("unclosed delimiter");
	});
});
