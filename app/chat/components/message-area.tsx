"use client";

import { cn } from "@/lib/utils";
import type { ChatAttachment } from "@/types/chat";
import type { UIMessage } from "ai";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useEffect, useRef, useState } from "react";
import ChatHistorySkeleton from "./chat-history-skeleton";
import MessageItem from "./message-item";

type MessageAreaProps = {
	messages: UIMessage[];
	thinkingTime: number | null;
	className?: string;
	onSelectAttachment?: (attachment: ChatAttachment) => void;
	onShowVnc?: () => void;
	isHistoryLoading?: boolean;
};

const AUTO_SCROLL_THRESHOLD = 80;

const MessageArea = ({
	messages,
	thinkingTime,
	className,
	onSelectAttachment,
	onShowVnc,
	isHistoryLoading = false,
}: MessageAreaProps) => {
	const t = useTranslations("chat");
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const previousLastMessageRef = useRef<UIMessage | undefined>(undefined);
	const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

	const isNearBottom = (element: HTMLDivElement) => {
		const distanceToBottom =
			element.scrollHeight - element.scrollTop - element.clientHeight;

		return distanceToBottom <= AUTO_SCROLL_THRESHOLD;
	};

	const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
		const container = scrollContainerRef.current;
		if (!container) {
			return;
		}

		container.scrollTo({
			top: container.scrollHeight,
			behavior,
		});
	};

	const handleScroll = () => {
		const container = scrollContainerRef.current;
		if (!container) {
			return;
		}

		setIsAutoScrollEnabled(isNearBottom(container));
	};

	useEffect(() => {
		const lastMessage = messages.at(-1);
		const previousLastMessage = previousLastMessageRef.current;

		if (
			lastMessage?.role === "user" &&
			lastMessage.id !== previousLastMessage?.id
		) {
			setIsAutoScrollEnabled(true);
		}

		previousLastMessageRef.current = lastMessage;
	}, [messages]);

	useEffect(() => {
		if (!isAutoScrollEnabled || isHistoryLoading) {
			return;
		}

		scrollToBottom();
	}, [isAutoScrollEnabled, isHistoryLoading, messages]);

	const hasToolCalls = messages.some((msg) =>
		msg.parts.some(
			(p) => typeof p.type === "string" && p.type.startsWith("tool-"),
		),
	);

	return (
		<div
			data-slot="message-area"
			className={cn("relative flex-1 overflow-hidden", className)}
		>
			<div
				ref={scrollContainerRef}
				data-testid="message-area-scroll-container"
				className="custom-scrollbar flex h-full w-full flex-col overflow-y-auto px-2 py-4"
				onScroll={handleScroll}
			>
				{isHistoryLoading && <ChatHistorySkeleton className="px-2 py-0" />}

				{!isHistoryLoading && messages.length === 0 && (
					<div className="flex flex-1 items-center justify-center">
						<p className="text-muted-foreground text-xs sm:text-sm">
							{t("sendMessage")}
						</p>
					</div>
				)}

				{!isHistoryLoading &&
					messages.map((message) => (
						<MessageItem
							key={message.id}
							message={message}
							thinkingTime={message.role === "assistant" ? thinkingTime : null}
							hasToolCalls={hasToolCalls}
							onSelectAttachment={onSelectAttachment}
							onShowVnc={onShowVnc}
						/>
					))}
			</div>
			{messages.length > 0 && !isAutoScrollEnabled && (
				<div className="pointer-events-none absolute right-4 bottom-4">
					<button
						type="button"
						className="pointer-events-auto inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs shadow-sm transition-colors duration-200 hover:bg-muted sm:text-sm"
						onClick={() => {
							scrollToBottom("smooth");
							setIsAutoScrollEnabled(true);
						}}
					>
						<ChevronDown className="size-4" />
						{t("jumpToLatest")}
					</button>
				</div>
			)}
		</div>
	);
};

export default memo(MessageArea);
