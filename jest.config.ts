import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
	dir: "./",
});

const customJestConfig: Config = {
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	moduleNameMapper: {
		"^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
		"^.+\\.(css|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",
		"^@/(.*)$": "<rootDir>/$1",
	},
	testEnvironment: "jest-environment-jsdom",
	testPathIgnorePatterns: ["<rootDir>/tests/e2e/"],
};

export default createJestConfig(customJestConfig);
