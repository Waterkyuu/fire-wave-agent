export async function register() {
	if (process.env.NODE_ENV !== "development") return;

	const proxyUrl =
		process.env.HTTPS_PROXY ||
		process.env.https_proxy ||
		process.env.HTTP_PROXY ||
		process.env.http_proxy;

	if (proxyUrl) {
		const { ProxyAgent, setGlobalDispatcher } = await import("undici");
		setGlobalDispatcher(new ProxyAgent(proxyUrl));
	}
}
