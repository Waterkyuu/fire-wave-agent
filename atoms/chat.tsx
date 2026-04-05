import { atom } from "jotai";

// The first input sent on the homepage
const firstUserInputAtom = atom<string>("");

export { firstUserInputAtom };
