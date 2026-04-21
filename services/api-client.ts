import jotaiStore from "@/atoms";
import loginDialogAtom from "@/atoms/login-dialog";
import type { ApiResponse } from "@/types";
import axios, {
	type AxiosResponse,
	type InternalAxiosRequestConfig,
	type AxiosError,
} from "axios";
import { toast } from "sonner";

const apiClient = axios.create({
	baseURL: "/api",
	withCredentials: true,
});

const resultEnum: Record<string, number> = {
	success: 0,
	unauthorized: 401,
	sensitive: 105,
};

const isCanceledRequest = (error: AxiosError<ApiResponse>): boolean => {
	return error.code === "ERR_CANCELED" || axios.isCancel(error);
};

apiClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		return config;
	},
	(error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
	(response: AxiosResponse<ApiResponse>) => {
		const { code, success, data, message } = response.data || {};

		if (code === resultEnum.success && success) {
			return data as unknown as AxiosResponse;
		}

		const validMsg = message || "Internal unknown error";

		return Promise.reject(new Error(validMsg));
	},

	(error: AxiosError<ApiResponse>) => {
		if (isCanceledRequest(error)) {
			// Request aborts are expected in effect cleanups and should stay silent.
			return Promise.reject(error);
		}

		const data = error.response?.data;

		const code = data?.code;
		const msg = data?.message;

		const errorMsg = msg || error.message;

		const status = error.response?.status;

		if (status === 401) {
			if (typeof window !== "undefined") {
				jotaiStore.set(loginDialogAtom, true);
			}
		}

		if (typeof window !== "undefined") toast.error(errorMsg);

		return Promise.reject(new Error(errorMsg));
	},
);

export { isCanceledRequest };
export default apiClient;
