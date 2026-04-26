import { compileAndRepairTypst } from "./typst-repair";

describe("compileAndRepairTypst", () => {
	it("returns compiled content without repair when Typst is valid", async () => {
		const repairTypst = jest.fn();
		const result = await compileAndRepairTypst("= Valid", {
			compileTypst: async () => ({ ok: true, svg: "<svg />" }),
			repairTypst,
		});

		expect(result.ok).toBe(true);
		expect(repairTypst).not.toHaveBeenCalled();
		if (result.ok) {
			expect(result.typstContent).toBe("= Valid");
			expect(result.svg).toBe("<svg />");
		}
	});

	it("repairs failed Typst and returns the successfully compiled content", async () => {
		const compileTypst = jest
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				error: "unclosed delimiter",
				diagnostics: "unclosed delimiter",
			})
			.mockResolvedValueOnce({ ok: true, svg: "<svg />" });
		const repairTypst = jest.fn(async () => "= Fixed");

		const result = await compileAndRepairTypst("= Broken", {
			compileTypst,
			repairTypst,
			maxRepairAttempts: 3,
		});

		expect(result.ok).toBe(true);
		expect(repairTypst).toHaveBeenCalledWith({
			attempt: 1,
			content: "= Broken",
			diagnostics: "unclosed delimiter",
		});
		if (result.ok) {
			expect(result.typstContent).toBe("= Fixed");
			expect(result.repairAttempts).toEqual([
				{
					attempt: 1,
					diagnostics: "unclosed delimiter",
					input: "= Broken",
					output: "= Fixed",
				},
			]);
		}
	});

	it("returns the last diagnostics after max repair attempts fail", async () => {
		const result = await compileAndRepairTypst("= Broken", {
			compileTypst: async () => ({
				ok: false,
				error: "still broken",
				diagnostics: "still broken",
			}),
			repairTypst: async () => "= Still Broken",
			maxRepairAttempts: 1,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe("still broken");
			expect(result.diagnostics).toBe("still broken");
			expect(result.typstContent).toBe("= Still Broken");
		}
	});
});
