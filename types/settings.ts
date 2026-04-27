type SettingTab = "system" | "skills" | "connections";

type Skill = {
	id: string;
	name: string;
	description: string;
	instructions: string;
	createdAt: number;
	updatedAt: number;
};

type SkillFormState = {
	id?: string;
	name: string;
	description: string;
	instructions: string;
};

type ConnectionService = "github" | "notion";

type ConnectionStatus = {
	service: ConnectionService;
	connected: boolean;
	connectedAt?: number;
};

export type {
	SettingTab,
	Skill,
	SkillFormState,
	ConnectionService,
	ConnectionStatus,
};
