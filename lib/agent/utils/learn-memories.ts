import { learnMemories } from "@/infra/schema/learn-memories";
import { desc, eq } from "drizzle-orm";

const DEFAULT_LEARN_MEMORY_LIMIT = 20;

type LearnMemoryPromptItem = {
	title: string;
	content: string;
};

type LearnMemoryReader = (
	type: string,
	limit: number,
) => Promise<LearnMemoryPromptItem[]>;

type LearnMemoryInput = {
	type: string;
	title: string;
	content: string;
};

type LearnMemoryWriter = (memory: LearnMemoryInput) => Promise<void>;

type BuildLearnMemoryPromptOptions = {
	limit?: number;
	readMemories?: LearnMemoryReader;
};

type UpsertLearnMemoryOptions = {
	writeMemory?: LearnMemoryWriter;
};

const readLearnMemoriesByType: LearnMemoryReader = async (type, limit) => {
	const { db } = await import("@/infra/drizzle");
	const rows = await db
		.select({
			title: learnMemories.title,
			content: learnMemories.content,
		})
		.from(learnMemories)
		.where(eq(learnMemories.type, type))
		.orderBy(desc(learnMemories.usageCount), desc(learnMemories.updatedAt))
		.limit(limit);

	return rows;
};

const writeLearnMemory: LearnMemoryWriter = async ({
	content,
	title,
	type,
}) => {
	const { db } = await import("@/infra/drizzle");
	const now = new Date();

	await db
		.insert(learnMemories)
		.values({
			type,
			title,
			content,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [learnMemories.type, learnMemories.title],
			set: {
				content,
				updatedAt: now,
			},
		});
};

const formatLearnMemoryPrompt = (
	type: string,
	memories: LearnMemoryPromptItem[],
): string => {
	if (memories.length === 0) {
		return "";
	}

	const lines = memories.map(
		({ content, title }, index) => `${index + 1}. ${title}\n${content}`,
	);

	return `## Learned ${type} corrections\n${lines.join("\n\n")}`;
};

const buildLearnMemoryPrompt = async (
	type: string,
	options: BuildLearnMemoryPromptOptions = {},
): Promise<string> => {
	const limit = options.limit ?? DEFAULT_LEARN_MEMORY_LIMIT;
	const readMemories = options.readMemories ?? readLearnMemoriesByType;
	const memories = await readMemories(type, limit);

	return formatLearnMemoryPrompt(type, memories);
};

const upsertLearnMemory = async (
	input: LearnMemoryInput,
	options: UpsertLearnMemoryOptions = {},
): Promise<void> => {
	const memory = {
		type: input.type.trim(),
		title: input.title.trim(),
		content: input.content.trim(),
	};

	if (!memory.type || !memory.title || !memory.content) {
		return;
	}

	const writeMemory = options.writeMemory ?? writeLearnMemory;
	await writeMemory(memory);
};

export {
	DEFAULT_LEARN_MEMORY_LIMIT,
	buildLearnMemoryPrompt,
	formatLearnMemoryPrompt,
	readLearnMemoriesByType,
	upsertLearnMemory,
	writeLearnMemory,
};
export type {
	BuildLearnMemoryPromptOptions,
	LearnMemoryInput,
	LearnMemoryPromptItem,
	LearnMemoryReader,
	LearnMemoryWriter,
	UpsertLearnMemoryOptions,
};
