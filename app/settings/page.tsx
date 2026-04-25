"use client";

import Header from "@/components/share/header";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import ConnectionsSettings from "./components/connections-settings";
import SkillSettings from "./components/skill-settings";
import SystemSettings from "./components/system-settings";
import type { SettingTab } from "./components/types";

const TABS: {
	key: SettingTab;
	icon: React.ComponentType<{ className?: string }>;
}[] = [
	{ key: "system", icon: () => null },
	{ key: "skills", icon: () => null },
	{ key: "connections", icon: () => null },
];

const SettingsPage = () => {
	const t = useTranslations("settings");
	const [activeTab, setActiveTab] = useState<SettingTab>("system");

	const handleTabChange = useCallback((tab: SettingTab) => {
		setActiveTab(tab);
	}, []);

	return (
		<div className="flex h-dvh flex-col">
			<Header />
			<div className="mx-auto flex w-full max-w-5xl flex-1 overflow-hidden px-4 py-6 md:px-6">
				<div className="grid w-full grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
					<nav className="flex gap-1 md:flex-col">
						{TABS.map(({ key }) => (
							<Button
								key={key}
								variant="ghost"
								className={cn(
									"justify-start font-medium text-sm transition-colors duration-200",
									activeTab === key
										? "bg-accent text-accent-foreground"
										: "text-muted-foreground hover:text-foreground",
								)}
								onClick={() => handleTabChange(key)}
							>
								{t(`tabs.${key}`)}
							</Button>
						))}
					</nav>

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
