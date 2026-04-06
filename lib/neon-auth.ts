import { createClient } from "@neondatabase/neon-js";

const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL ?? "";
const neonDataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_PUBLIC_API_URL ?? "";

// Docs: https://neon.com/docs/reference/javascript-sdk
// Auth & database query
export const client = createClient({
	auth: {
		url: neonAuthUrl,
	},
	dataApi: {
		url: neonDataApiUrl,
	},
});
