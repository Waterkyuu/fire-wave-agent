import { auth } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authMiddleware = async (request: NextRequest) => {
	const { data: session } = await auth.getSession();

	if (
		!session?.user &&
		!request.nextUrl.pathname.startsWith("/login") &&
		!request.nextUrl.pathname.startsWith("/auth")
	) {
		if (request.nextUrl.pathname.startsWith("/api")) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized request" },
				{ status: 401 },
			);
		}

		const url = request.nextUrl.clone();
		url.pathname = "/";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
};

export default authMiddleware;
