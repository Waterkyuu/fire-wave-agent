"use client";

import Header from "@/components/share/header";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SettingTab } from "@/types";
import { useCallback, useState } from "react";
import ConnectionsSettings from "./components/connections-settings";
import LeftTabs from "./components/left-tabs";
import SkillSettings from "./components/skill-settings";
import SystemSettings from "./components/system-settings";

const SettingsPage = () => {
	const [activeTab, setActiveTab] = useState<SettingTab>("system");

	const handleTabChange = useCallback((tab: SettingTab) => {
		setActiveTab(tab);
	}, []);

	return (
		<div className="flex h-full flex-col">
			<Header />
			<div className="flex w-full flex-1 overflow-hidden px-6 py-6 md:px-8">
				<div className="grid w-full grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
					<LeftTabs activeTab={activeTab} onChange={handleTabChange} />

					<ScrollArea className="h-full">
						<div className="pr-4 pb-8">
							{activeTab === "system" && <SystemSettings />}
							{activeTab === "skills" && <SkillSettings />}
							{activeTab === "connections" && <ConnectionsSettings />}
						</div>
					</ScrollArea>
				</div>
			</div>
		</div>
	);
};

export default SettingsPage;
