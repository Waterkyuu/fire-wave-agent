import "axios";

declare module "axios" {
	// Change the default Promise<AxiosResponse<T>> to Promise<T>
	export interface AxiosInstance {
		request<T = unknown>(config: AxiosRequestConfig): Promise<T>;
		get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
		delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
		head<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
		post<T = unknown>(
			url: string,
			data?: unknown,
			config?: AxiosRequestConfig,
		): Promise<T>;
		put<T = unknown>(
			url: string,
			data?: unknown,
			config?: AxiosRequestConfig,
		): Promise<T>;
		patch<T = unknown>(
			url: string,
			data?: unknown,
			config?: AxiosRequestConfig,
		): Promise<T>;
	}
}
