import { atom } from "jotai";

type Mode = "Typst" | "Markdown";

// Dialogue message atom

// The first input sent on the homepage
const firstUserInputAtom = atom<string>("");

export { firstUserInputAtom };
