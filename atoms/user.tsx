import type { User } from "@/types";
import { atom } from "jotai";
import { RESET, atomWithReset } from "jotai/utils";

// Set the default user information
const defaultUserInfo: User = {
	id: "",
	userName: "",
	email: "",
	avatar: "",
	createdAt: "",
	updatedAt: "",
};

// User information atom
const userAtom = atomWithReset<User>(defaultUserInfo);

// Judge whether the user has logged in
const isLoginAtom = atom((get) => !!get(userAtom).id);

// Log in to change information
const loginAtom = atom(null, (_, set, user: User) => set(userAtom, user));

// Log out the reset information
const logoutAtom = atom(null, (_, set) => set(userAtom, RESET));

export { userAtom, isLoginAtom, loginAtom, logoutAtom };
