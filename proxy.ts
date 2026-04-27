import authProxy from "@/middlewares/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const proxies = [authProxy];

export async function proxy(request: NextRequest) {
	for (const p of proxies) {
		const response = await p(request);
		if (response && response !== NextResponse.next()) {
			return response;
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/settings/:path*", "/chat/:path*", "/api/:path*"],
};
