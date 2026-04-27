import type { ApiResponse } from "@/types";
import type { AxiosError } from "axios";
import { isCanceledRequest } from "./api-client";

const toAxiosError = (
	partial: Partial<AxiosError<ApiResponse>>,
): AxiosError<ApiResponse> => {
	return {
		config: {} as AxiosError<ApiResponse>["config"],
		isAxiosError: true,
		name: "AxiosError",
		toJSON: () => ({}),
		...partial,
	} as AxiosError<ApiResponse>;
};

describe("isCanceledRequest", () => {
	it("returns true for aborted requests", () => {
		const canceledError = toAxiosError({
			code: "ERR_CANCELED",
			message: "canceled",
			name: "CanceledError",
		});

		expect(isCanceledRequest(canceledError)).toBe(true);
	});

	it("returns false for regular request errors", () => {
		const networkError = toAxiosError({
			code: "ERR_NETWORK",
			message: "Network Error",
		});

		expect(isCanceledRequest(networkError)).toBe(false);
	});
});
