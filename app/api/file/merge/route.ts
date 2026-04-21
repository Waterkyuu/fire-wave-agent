import { getFileDownloadUrl, mergeUploadedFile } from "@/lib/file-store";
import { NextResponse } from "next/server";
import { z } from "zod";

const MergeBodySchema = z.object({
	filename: z.string().min(1),
	total: z.number().int().positive(),
	contentType: z.string().optional(),
});

const POST = async (req: Request) => {
	try {
		const body = MergeBodySchema.parse(await req.json());
		const record = await mergeUploadedFile({
			contentType: body.contentType,
			filename: body.filename,
			totalChunks: body.total,
		});

		return NextResponse.json({
			code: 0,
			success: true,
			message: "File merged.",
			data: {
				download_url: getFileDownloadUrl(record),
				file_id: record.id,
				kind: record.kind,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				code: 500,
				success: false,
				message:
					error instanceof Error ? error.message : "Failed to merge file.",
			},
			{ status: 500 },
		);
	}
};

export { POST };
