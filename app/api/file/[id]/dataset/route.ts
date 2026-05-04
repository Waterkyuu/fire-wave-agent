import { getDatasetPreviewByFileId } from "@/lib/file/file-store";
import { type NextRequest, NextResponse } from "next/server";

type FileDatasetRouteContext = {
	params: Promise<{ id: string }>;
};

const DEFAULT_PREVIEW_ROWS = 200;

const parsePreviewRows = (req: NextRequest) => {
	const rowParam = req.nextUrl.searchParams.get("rows");
	if (!rowParam) {
		return DEFAULT_PREVIEW_ROWS;
	}

	const parsed = Number.parseInt(rowParam, 10);
	return Number.isFinite(parsed) ? parsed : DEFAULT_PREVIEW_ROWS;
};

const GET = async (req: NextRequest, { params }: FileDatasetRouteContext) => {
	try {
		const { id } = await params;
		const rows = parsePreviewRows(req);
		const dataset = await getDatasetPreviewByFileId(id, rows);

		return NextResponse.json(
			{
				code: 0,
				success: true,
				message: "Dataset preview fetched.",
				data: {
					download_url: dataset.downloadUrl,
					file_id: dataset.fileId,
					filename: dataset.filename,
					preview: dataset.preview,
				},
			},
			{
				headers: {
					"Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
				},
			},
		);
	} catch (error) {
		return NextResponse.json(
			{
				code: 404,
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Unable to load dataset preview.",
			},
			{ status: 404 },
		);
	}
};

export { GET };
