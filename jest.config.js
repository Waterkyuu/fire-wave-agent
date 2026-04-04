const nextJest = require("next/jest");

const createJestConfig = nextJest({
	// 指向 Next.js 应用的路径
	dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
	// 在每次测试之前运行的设置文件
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"], // 注意这里改成 .ts

	// 处理模块别名（如果你在 tsconfig.json 配置了 paths）
	// next/jest 会自动处理绝大部分，但如果你遇到别名报错，可以在这里手动映射
	moduleNameMapper: {
		// Handle CSS imports (with CSS modules)
		// https://jestjs.io/docs/webpack#mocking-css-modules
		"^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",

		// Handle CSS imports (without CSS modules)
		"^.+\\.(css|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",

		// 处理 @/ imports
		// 注意：如果你的源码都在根目录而不是 src 目录，请把 moduleNameMapper 里的 '<rootDir>/src/$1' 改为 '<rootDir>/$1'。
		"^@/(.*)$": "<rootDir>/$1",
	},

	// 模拟浏览器环境
	testEnvironment: "jest-environment-jsdom",
};

module.exports = createJestConfig(customJestConfig);
