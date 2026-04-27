import { auth } from "@/lib/auth/server";
import type { ApiResponse } from "@/types/api";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authMiddleware = async (request: NextRequest) => {
	if (request.nextUrl.pathname.startsWith("/api/auth")) {
		return NextResponse.next();
	}

	type SessionData = Awaited<ReturnType<typeof auth.getSession>>["data"];
	let session: SessionData = undefined;

	try {
		const result = await auth.getSession();
		session = result.data;
	} catch (error) {
		console.error("[auth] Failed to fetch session:", error);
		if (request.nextUrl.pathname.startsWith("/api")) {
			const body: ApiResponse = {
				code: 503,
				success: false,
				message: "Auth service unavailable",
			};
			return NextResponse.json(body, { status: 503 });
		}
		return NextResponse.next();
	}

	if (
		!session?.user &&
		!request.nextUrl.pathname.startsWith("/login") &&
		!request.nextUrl.pathname.startsWith("/auth")
	) {
		if (request.nextUrl.pathname.startsWith("/api")) {
			const body: ApiResponse = {
				code: 401,
				success: false,
				message: "Unauthorized request",
			};
			return NextResponse.json(body, { status: 401 });
		}

		const url = request.nextUrl.clone();
		url.pathname = "/";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
};

export default authMiddleware;
