"use client";

import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			icons={{
				success: <CircleCheckIcon className="size-4 text-green-400" />,
				info: <InfoIcon className="size-4" />,
				warning: <TriangleAlertIcon className="size-4" />,
				error: <OctagonXIcon className="size-4 text-red-500" />,
				loading: <Loader2Icon className="size-4 animate-spin" />,
			}}
			toastOptions={{
				classNames: {
					success: "bg-green-200 border-green-300",
					error: "bg-red-200 border-red-300",
				},
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--success-bg": "#bbf7d0",
					"--success-text": "var(--popover-foreground)",
					"--success-border": "var(--border)",
					"--error-bg": "#fecaca",
					"--error-text": "var(--popover-foreground)",
					"--error-border": "var(--border)",
					"--border-radius": "var(--radius)",
				} as React.CSSProperties
			}
			{...props}
		/>
	);
};

export { Toaster };
