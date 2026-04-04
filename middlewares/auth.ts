import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next();

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL as string,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(
					cookiesToSet: {
						name: string;
						value: string;
						options: CookieOptions;
					}[],
				) {
					// Next, the request will be further passed to the server component
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					supabaseResponse = NextResponse.next();
					// If the token expires, set a new cookie and return it to the browser (the
					// server component cannot refresh the token but can only refresh it in the middleware).
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	// Check the identity and redirect when the identity is incorrect
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (
		!user &&
		!request.nextUrl.pathname.startsWith("/login") &&
		!request.nextUrl.pathname.startsWith("/auth")
	) {
		// If it is an api request and a specific response is returned, login after being captured by the front end
		if (request.nextUrl.pathname.startsWith("/api")) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized request" },
				{ status: 401 },
			);
		}
		// If it is the navigation of a browser, it will directly redirect to login
		// no user, potentially respond by redirecting the user to the login page
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	return supabaseResponse;
}
