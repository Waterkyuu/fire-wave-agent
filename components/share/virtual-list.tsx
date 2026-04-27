"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useRef } from "react";

const DEFAULT_ROW_HEIGHT = 36;
const FALLBACK_RENDER_ROWS = 200;

type VirtualListProps = {
	columns: string[];
	datasetId: string;
	rowHeight?: number;
	rows: string[][];
};

const VirtualList = memo(
	({
		columns,
		datasetId,
		rowHeight = DEFAULT_ROW_HEIGHT,
		rows,
	}: VirtualListProps) => {
		const scrollRef = useRef<HTMLDivElement>(null);
		const virtualizer = useVirtualizer({
			count: rows.length,
			getScrollElement: () => scrollRef.current,
			estimateSize: () => rowHeight,
			overscan: 10,
		});
		const virtualRows = virtualizer.getVirtualItems();
		const shouldUseVirtualRows = virtualRows.length > 0;

		return (
			<div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
				<div className="min-w-full text-left text-xs sm:text-sm">
					<div className="sticky top-0 z-10 flex w-full border-b bg-background">
						{columns.map((column) => (
							<div
								key={column}
								className="min-w-0 flex-1 whitespace-nowrap px-3 py-2 font-medium"
							>
								{column}
							</div>
						))}
					</div>

					{shouldUseVirtualRows ? (
						<div
							style={{
								height: `${virtualizer.getTotalSize()}px`,
								position: "relative",
							}}
						>
							{virtualRows.map((virtualRow) => {
								const row = rows[virtualRow.index];
								return (
									<div
										key={`${datasetId}-${virtualRow.index}`}
										className="absolute flex w-full border-b"
										style={{
											height: `${virtualRow.size}px`,
											top: `${virtualRow.start}px`,
										}}
									>
										{row.map((cell, cellIndex) => (
											<div
												key={`${datasetId}-${virtualRow.index}-${cellIndex}`}
												className="min-w-0 flex-1 truncate px-3 py-2 text-muted-foreground"
												title={cell}
											>
												{cell}
											</div>
										))}
									</div>
								);
							})}
						</div>
					) : (
						<div>
							{/* JSDOM and collapsed containers can report zero height, so keep a small non-virtual fallback. */}
							{rows.slice(0, FALLBACK_RENDER_ROWS).map((row, rowIndex) => (
								<div
									key={`${datasetId}-${rowIndex}`}
									className="flex w-full border-b"
								>
									{row.map((cell, cellIndex) => (
										<div
											key={`${datasetId}-${rowIndex}-${cellIndex}`}
											className="min-w-0 flex-1 truncate px-3 py-2 text-muted-foreground"
											title={cell}
										>
											{cell}
										</div>
									))}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		);
	},
);

export default VirtualList;
export type { VirtualListProps };
