import jotaiStore, { logoutAtom } from "@/atoms";
import { authClient } from "@/lib/auth/client";

type Provider = "google" | "github" | "vercel";

const getAuthErrorMessage = (error: unknown, fallbackMessage: string) => {
	if (
		error &&
		typeof error === "object" &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message;
	}

	return fallbackMessage;
};

const sendSignInOtp = async (email: string) => {
	const { error } = await authClient.emailOtp.sendVerificationOtp({
		email,
		type: "sign-in",
	});
	if (error) throw error;
};

const signInWithOtp = async (email: string, otpCode: string) => {
	const { error } = await authClient.signIn.emailOtp({
		email,
		otp: otpCode,
	});
	if (error) throw error;
};

const handleOAuthSignIn = async (provider: Provider) => {
	await authClient.signIn.social({
		provider,
		callbackURL: window.location.origin,
	});
};

const signInGoogle = async () => {
	await handleOAuthSignIn("google");
};

const signInGithub = async () => {
	await handleOAuthSignIn("github");
};

const signInVercel = async () => {
	await handleOAuthSignIn("vercel");
};

const signOut = async () => {
	const { error } = await authClient.signOut();
	if (error) {
		throw new Error(getAuthErrorMessage(error, "Failed to sign out"));
	}
	jotaiStore.set(logoutAtom);
};

export {
	signOut,
	signInGithub,
	sendSignInOtp,
	signInWithOtp,
	signInVercel,
	signInGoogle,
};
