import { createLoadSkillTool } from "@/lib/agent/tools/skill-tools";
import type { SandboxSession } from "@/lib/e2b";
import { createCodeInterpreterTool, createPersistCodeFileTool } from "./shared";

const createReportTools = (sandboxSession: SandboxSession) => ({
	codeInterpreter: createCodeInterpreterTool({ fileIds: [], sandboxSession }),
	persistCodeFile: createPersistCodeFileTool(sandboxSession),
	loadSkill: createLoadSkillTool(),
});

export { createReportTools };
