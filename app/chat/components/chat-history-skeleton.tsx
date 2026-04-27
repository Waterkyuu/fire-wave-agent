import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ChatHistorySkeletonProps = {
	className?: string;
};

const skeletonMessages = [
	{
		id: "assistant-intro",
		role: "assistant",
		lines: ["w-16", "w-64 max-w-full", "w-48 max-w-[80%]"],
	},
	{
		id: "user-question",
		role: "user",
		lines: ["w-24", "w-56 max-w-full"],
	},
	{
		id: "assistant-followup",
		role: "assistant",
		lines: ["w-20", "w-72 max-w-full", "w-40 max-w-[70%]"],
	},
] as const;

const ChatHistorySkeleton = ({ className }: ChatHistorySkeletonProps) => {
	return (
		<div
			data-slot="chat-history-skeleton"
			data-testid="chat-history-skeleton"
			className={cn("flex h-full w-full flex-col gap-3 px-4 py-4", className)}
		>
			{skeletonMessages.map((message) => {
				const isUser = message.role === "user";

				return (
					<div
						key={message.id}
						className={cn(
							"flex gap-3",
							isUser ? "justify-end" : "justify-start",
						)}
					>
						{!isUser && <Skeleton className="mt-1 size-6 rounded-full" />}

						<div
							className={cn(
								"flex max-w-[80%] flex-col gap-2",
								isUser && "items-end",
							)}
						>
							{message.lines.map((widthClass) => (
								<Skeleton
									key={`${message.id}-${widthClass}`}
									className={cn("h-4 rounded-full", widthClass)}
								/>
							))}
						</div>

						{isUser && <Skeleton className="mt-1 size-6 rounded-full" />}
					</div>
				);
			})}
		</div>
	);
};

export default ChatHistorySkeleton;
