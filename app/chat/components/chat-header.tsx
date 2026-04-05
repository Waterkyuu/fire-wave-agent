"use client";

import { sidebarOpenAtom } from "@/atoms/sidebar";
import { Header } from "@/components/share/header";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";

const ChatHeader = () => {
	const [, setSidebarOpen] = useAtom(sidebarOpenAtom);
	const router = useRouter();

	return (
		<Header
			onHistoryClick={() => setSidebarOpen(true)}
			onNewChatClick={() => router.push("/")}
		/>
	);
};

export default ChatHeader;
