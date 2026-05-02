import { z } from "zod";

const MarkdownPdfExportRequestSchema = z.object({
	filename: z.string().trim().min(1).optional(),
	markdownContent: z.string().trim().min(1),
});

type MarkdownPdfExportRequest = z.infer<typeof MarkdownPdfExportRequestSchema>;

export { MarkdownPdfExportRequestSchema };
export type { MarkdownPdfExportRequest };
