import { updateSession } from "@/middlewares/auth";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
	return await updateSession(request);
}

export const config = {
	matcher: [
		// 受保护页面
		"/settings/:path*",
		"/mycreations/:path*",
		"/myfavourite/:path*",
		"/morecredits/:path*",

		// // // 对所有api请求进行中间件身份鉴权 防止恶意用户
		// "/api/:path*",
	],
};
