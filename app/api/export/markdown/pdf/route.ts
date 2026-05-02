import { MarkdownPdfExportRequestSchema } from "@/lib/markdown-export/pdf-export-schema";
import { renderMarkdownPdf } from "@/lib/markdown-export/pdf-service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const toArrayBuffer = (bytes: Uint8Array) => {
	const body = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(body).set(bytes);
	return body;
};

const POST = async (request: Request) => {
	try {
		const body = await request.json();
		const parsed = MarkdownPdfExportRequestSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{
					code: 400,
					success: false,
					message: "Invalid export request",
				},
				{ status: 400 },
			);
		}

		const { bytes, filename } = await renderMarkdownPdf(parsed.data);

		return new NextResponse(toArrayBuffer(bytes), {
			headers: {
				"Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
				"Content-Length": String(bytes.byteLength),
				"Content-Type": "application/pdf",
			},
			status: 200,
		});
	} catch (error) {
		console.error("[Markdown PDF Export API Error]", error);
		return NextResponse.json(
			{
				code: 500,
				success: false,
				message: "Failed to generate PDF",
			},
			{ status: 500 },
		);
	}
};

export { POST };
