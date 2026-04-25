export async function register() {
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
