import { handleError } from "@/lib/error-handler";
import {
	type Messages,
	MessagesSchema,
	type Sessions,
	SessionsSchema,
} from "@/types/chat";
import {
	type UseMutationResult,
	type UseQueryResult,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import { zodGet, zodPost } from "./request";

// Schema for empty response (backend returns null for data)
const EmptySchema = z.null();

// ============ API Functions ============

/**
 * Get chat history by session ID
 * @param sessionId - The session ID to fetch history for
 * @returns Array of messages or empty array on error
 */
const getChatHistory = async (sessionId: string): Promise<Messages> => {
	try {
		return await zodGet(`/message/history/${sessionId}`, MessagesSchema);
	} catch (error) {
		handleError(error);
		return [];
	}
};

/**
 * Get all chat sessions
 * @returns Array of sessions or empty array on error
 */
const getAllSessions = async (): Promise<Sessions> => {
	try {
		return await zodGet("/message/get-sessions", SessionsSchema);
	} catch (error) {
		handleError(error);
		return [];
	}
};

/**
 * Update session title
 * @param sessionId - The session ID to update
 * @param title - The new title for the session
 * @returns void
 */
const updateSessionTitle = async (
	sessionId: string,
	title: string,
): Promise<void> => {
	try {
		await zodPost(
			"/message/update-session-title",
			{ sessionId: sessionId, title },
			EmptySchema,
		);
	} catch (error) {
		handleError(error);
		throw error;
	}
};

/**
 * Delete a single session
 * @param sessionId - The session ID to delete
 * @returns void
 */
const deleteSession = async (sessionId: string): Promise<void> => {
	try {
		await zodPost(
			`/message/delete-single-session/${sessionId}`,
			{},
			EmptySchema,
		);
	} catch (error) {
		handleError(error);
		throw error;
	}
};

/**
 * Custom hook to fetch chat history using TanStack Query
 * @param sessionId - The session ID to fetch history for
 * @param shouldFetch - Additional condition to enable fetching (e.g., firstUserInput && !isHome)
 * @returns Query result with data, isLoading, error, etc.
 */
const useChatHistory = (
	sessionId: string | undefined,
	shouldFetch = true,
): UseQueryResult<Messages, Error> => {
	return useQuery({
		queryKey: ["chatHistory", sessionId],
		queryFn: () => {
			if (!sessionId) {
				return Promise.reject(new Error("Session ID is required"));
			}
			return getChatHistory(sessionId);
		},
		enabled: !!sessionId && shouldFetch,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
	});
};

/**
 * Custom hook to fetch all chat sessions using TanStack Query
 * @returns Query result with data, isLoading, error, etc.
 */
const useAllSessions = (): UseQueryResult<Sessions, Error> => {
	return useQuery({
		queryKey: ["allSessions"],
		queryFn: getAllSessions,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
	});
};

/**
 * Custom hook to update session title using TanStack Query
 * @returns Mutation result with mutate, isLoading, error, etc.
 */
const useUpdateSessionTitle = (): UseMutationResult<
	void,
	Error,
	{ sessionId: string; title: string }
> => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ sessionId, title }) => updateSessionTitle(sessionId, title),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["allSessions"] });
		},
	});
};

/**
 * Custom hook to delete a session using TanStack Query
 * @returns Mutation result with mutate, isLoading, error, etc.
 */
const useDeleteSession = (): UseMutationResult<void, Error, string> => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteSession,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["allSessions"] });
		},
	});
};

export {
	getChatHistory,
	getAllSessions,
	updateSessionTitle,
	deleteSession,
	useChatHistory,
	useAllSessions,
	useUpdateSessionTitle,
	useDeleteSession,
};
