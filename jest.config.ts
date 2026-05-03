import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
	dir: "./",
});

const customJestConfig: Config = {
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	moduleNameMapper: {
		"^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
		"^.+\\.(css|sass|scss)$": "<rootDir>/__mocks__/style-mock.js",
		"^@/(.*)$": "<rootDir>/$1",
	},
	testEnvironment: "jest-environment-jsdom",
	testPathIgnorePatterns: ["<rootDir>/tests/e2e/"],
	transformIgnorePatterns: [
		"/node_modules/(?!(unified|bail|devlop|extend|is-plain-obj|trough|vfile|vfile-message|unist-util-stringify-position|remark-parse|remark-gfm|remark-math|mdast-util-from-markdown|mdast-util-gfm|mdast-util-gfm-autolink-literal|mdast-util-gfm-footnote|mdast-util-gfm-strikethrough|mdast-util-gfm-table|mdast-util-gfm-task-list-item|mdast-util-math|mdast-util-to-markdown|mdast-util-to-string|mdast-util-phrasing|mdast-util-find-and-replace|micromark|micromark-core-commonmark|micromark-extension-gfm|micromark-extension-gfm-autolink-literal|micromark-extension-gfm-footnote|micromark-extension-gfm-strikethrough|micromark-extension-gfm-table|micromark-extension-gfm-tagfilter|micromark-extension-gfm-task-list-item|micromark-extension-math|micromark-factory-destination|micromark-factory-label|micromark-factory-space|micromark-factory-title|micromark-factory-whitespace|micromark-util-character|micromark-util-chunked|micromark-util-classify-character|micromark-util-combine-extensions|micromark-util-decode-numeric-character-reference|micromark-util-decode-string|micromark-util-encode|micromark-util-html-tag-name|micromark-util-normalize-identifier|micromark-util-resolve-all|micromark-util-sanitize-uri|micromark-util-subtokenize|micromark-util-symbol|micromark-util-types|decode-named-character-reference|character-entities|character-entities-html4|character-entities-legacy|markdown-table|unist-util-visit|unist-util-is|unist-util-visit-parents|unist-util-position|unist-util-generated|unist-util-remove-position|unist-util-stringify-position)/)",
	],
};

export default createJestConfig(customJestConfig);
