"use client";

import { Toaster } from "@/components/ui/sonner";
import { getUserInfo } from "@/services/user";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

const queryClient = new QueryClient();

const AppProviders = ({ children }: { children: React.ReactNode }) => {
	useEffect(() => {
		getUserInfo();
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<Toaster richColors />
		</QueryClientProvider>
	);
};

export { AppProviders };
