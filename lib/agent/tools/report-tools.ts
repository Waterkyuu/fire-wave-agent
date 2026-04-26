import { createLoadSkillTool } from "@/lib/agent/tools/skill-tools";

const createReportTools = () => ({
	loadSkill: createLoadSkillTool(),
});

export { createReportTools };
