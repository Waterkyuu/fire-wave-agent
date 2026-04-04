import { toast } from "sonner";
import type { ZodError } from "zod";

// General error handler
const handleError = (error: unknown, prefixMsg?: string): string => {
	console.error(prefixMsg, error);
	let errorMsg = "Unknown error";

	if (error instanceof Error) {
		errorMsg = error?.message;
	}

	toast.error(errorMsg, {
		action: {
			label: "Undo",
			onClick: () => console.log("Undo"),
		},
	});

	// Return the error message to the UI display
	return errorMsg;
};

// Return a zod error message
const getZodErrorMsg = (error: ZodError): string[] => {
	console.error(error);

	const errorMessages: string[] = [];

	error.issues.forEach((item) => {
		errorMessages.push(item.message);
	});

	return errorMessages;
};

export { handleError, getZodErrorMsg };
