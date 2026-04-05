import { z } from "zod";

// Tool call schema for function calling (aligned with Eino framework)
const ToolCallSchema = z.object({
	id: z.string(),
	type: z.literal("function"),
	function: z.object({
		name: z.string(),
		arguments: z.string(), // JSON string of function arguments
	}),
});

// Message role types
const RoleSchema = z.enum(["user", "assistant", "tool"]);

// Message item schema with support for tool calls and reasoning
const MessageItemSchema = z.object({
	role: RoleSchema,
	content: z.string().nullable().optional(), // Content can be null for tool calls
	reasoning_content: z.string().optional(), // Chain of thought reasoning (separate message)
	tool_calls: z.array(ToolCallSchema).optional(), // Tool function calls
	tool_call_id: z.string().optional(), // Tool call ID for tool messages
	tool_name: z.string().optional(), // Tool name for tool messages
	version: z.string().optional(), // Current version, optional v1 v2
});

const MessagesSchema = z.array(MessageItemSchema);

const SessionItemSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	title: z.string(),
	updatedAt: z.coerce.date(),
	createdAt: z.coerce.date(),
});

const SessionsSchema = z.array(SessionItemSchema);

type MessageItem = z.infer<typeof MessageItemSchema>;
type Messages = MessageItem[];
type SessionItem = z.infer<typeof SessionItemSchema>;
type Sessions = SessionItem[];
type ToolCall = z.infer<typeof ToolCallSchema>;
type Role = z.infer<typeof RoleSchema>;

export {
	MessageItemSchema,
	MessagesSchema,
	SessionItemSchema,
	SessionsSchema,
	type MessageItem,
	type Messages,
	type SessionItem,
	type Sessions,
	type ToolCall,
	type Role,
};
