"use client";

import MarkdownBlockEditor from "@/app/chat/components/markdown-panel/markdown-block-editor";
import Header from "@/components/share/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Code2, FileText, FlaskConical, Sparkles } from "lucide-react";
import type { ChangeEvent, MouseEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

type DemoPresetKey = "report" | "technical";

type DemoPreset = {
	description: string;
	key: DemoPresetKey;
	label: string;
	markdown: string;
};

const REPORT_PRESET = `# Quarterly Report

The growth team shipped three experiments in March and recovered conversion by 8.4%.

- Landing page refresh
- Pricing test
- Retention email cleanup

\`\`\`ts
const revenueGrowth = 8.4;
console.log(\`Growth: \${revenueGrowth}%\`);
\`\`\`
`;

const TECHNICAL_PRESET = `# Technical Blocks

This preset mixes code, Mermaid, and LaTeX so you can try the editor against richer markdown.

\`\`\`mermaid
graph TD
  User[User] --> Panel[Block Editor]
  Panel --> Markdown[Markdown Output]
\`\`\`

$$
E = mc^2
$$

\`\`\`ts
type BlockNode = {
  type: "paragraph" | "heading" | "code";
};
\`\`\`
`;

const DEMO_PRESETS: DemoPreset[] = [
	{
		key: "report",
		label: "Report Sample",
		description: "Basic headings, paragraphs, lists, and code blocks.",
		markdown: REPORT_PRESET,
	},
	{
		key: "technical",
		label: "Technical Blocks",
		description: "Mermaid, LaTeX, and code-heavy markdown for richer testing.",
		markdown: TECHNICAL_PRESET,
	},
];

const BlockEditorDemoPage = () => {
	const contentRef = useRef<HTMLElement>(null);
	const [activePreset, setActivePreset] = useState<DemoPresetKey>("report");
	const [markdown, setMarkdown] = useState(REPORT_PRESET);

	const activePresetMeta = useMemo(
		() =>
			DEMO_PRESETS.find((preset) => preset.key === activePreset) ??
			DEMO_PRESETS[0],
		[activePreset],
	);

	const handlePresetChange = useCallback((presetKey: DemoPresetKey) => {
		const targetPreset =
			DEMO_PRESETS.find((preset) => preset.key === presetKey) ??
			DEMO_PRESETS[0];
		setActivePreset(targetPreset.key);
		setMarkdown(targetPreset.markdown);
	}, []);

	const handleMarkdownInputChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			setMarkdown(event.target.value);
		},
		[],
	);

	const handleEditorMarkdownChange = useCallback((nextMarkdown: string) => {
		setMarkdown(nextMarkdown);
	}, []);

	const handlePresetButtonClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			const presetKey = event.currentTarget.dataset.presetKey as
				| DemoPresetKey
				| undefined;

			if (!presetKey) {
				return;
			}

			handlePresetChange(presetKey);
		},
		[handlePresetChange],
	);

	return (
		<div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_rgba(212,228,255,0.65),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]">
			<Header />
			<main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-8">
				<section className="overflow-hidden rounded-3xl border border-border/60 bg-background/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
					<div className="border-b bg-[linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(241,245,249,0.9))] px-6 py-6">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div className="space-y-3">
								<div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-muted-foreground text-xs uppercase tracking-[0.24em]">
									<FlaskConical className="size-3.5" />
									Playground
								</div>
								<div className="space-y-2">
									<h1 className="font-semibold text-3xl tracking-tight">
										Block Editor Playground
									</h1>
									<p className="max-w-3xl text-base text-muted-foreground leading-7">
										Use this route to manually test the workspace block editor
										with live markdown on the left and the current editor shell
										on the right.
									</p>
								</div>
							</div>
							<div className="rounded-2xl border bg-muted/40 px-4 py-3 text-sm">
								<div className="font-medium">Route</div>
								<div className="font-mono text-muted-foreground">
									/demo/block-editor
								</div>
							</div>
						</div>
					</div>

					<div className="border-b px-6 py-4">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div className="space-y-1">
								<div className="flex items-center gap-2 font-medium text-sm">
									<Sparkles className="size-4" />
									Sample Presets
								</div>
								<p className="text-muted-foreground text-sm">
									{activePresetMeta.description}
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								{DEMO_PRESETS.map((preset) => (
									<Button
										key={preset.key}
										type="button"
										data-preset-key={preset.key}
										size="sm"
										variant={
											activePreset === preset.key ? "default" : "outline"
										}
										className={cn("gap-2 transition-colors duration-200")}
										onClick={handlePresetButtonClick}
									>
										{preset.key === "report" ? (
											<FileText className="size-4" />
										) : (
											<Code2 className="size-4" />
										)}
										{preset.label}
									</Button>
								))}
							</div>
						</div>
					</div>

					<div className="grid min-h-[720px] grid-cols-1 divide-y lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
						<section className="flex min-h-0 flex-col bg-background">
							<div className="border-b px-6 py-4">
								<label
									htmlFor="block-editor-demo-markdown"
									className="font-medium text-sm"
								>
									Markdown Source
								</label>
								<p className="mt-1 text-muted-foreground text-sm">
									Paste markdown here or edit blocks on the right and watch this
									source stay in sync.
								</p>
							</div>
							<div className="flex min-h-0 flex-1 flex-col p-4">
								<textarea
									id="block-editor-demo-markdown"
									value={markdown}
									onChange={handleMarkdownInputChange}
									spellCheck={false}
									className={cn(
										"min-h-[360px] flex-1 resize-none rounded-2xl border bg-slate-950 px-4 py-4 font-mono text-slate-50 text-sm shadow-inner outline-none transition-colors duration-200",
										"focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
									)}
								/>
							</div>
						</section>

						<section className="flex min-h-0 flex-col bg-muted/20">
							<div className="border-b px-6 py-4">
								<div className="font-medium text-sm">Editor Preview</div>
								<p className="mt-1 text-muted-foreground text-sm">
									This is the same markdown block editor shell used in the
									workspace panel.
								</p>
							</div>
							<div className="min-h-0 flex-1">
								<MarkdownBlockEditor
									contentRef={contentRef}
									markdownContent={markdown}
									onMarkdownChange={handleEditorMarkdownChange}
								/>
							</div>
						</section>
					</div>
				</section>
			</main>
		</div>
	);
};

export default BlockEditorDemoPage;
