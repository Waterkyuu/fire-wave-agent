"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleError } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { signOut } from "@/services/user";
import { useTranslations } from "next-intl";
import Link from "next/link";

type AvatarProps = {
	mode?: "default" | "online" | "offline";
	avatarUrl?: string | null; // Optional, can be null
	className?: string;
};

const Avatar = ({ mode = "default", className = "" }: AvatarProps) => {
	const t = useTranslations("avatar");

	const handleSignOut = async () => {
		try {
			await signOut();
		} catch (error) {
			handleError(error);
		}
	};

	// Get user avatar and email
	if (mode === "online") {
		return (
			<div className={cn("relative size-8 rounded-full md:size-10", className)}>
				<img
					src="/preset/avatar.webp"
					alt="User avatar"
					className="rounded-full"
				/>
				<div className="absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 md:h-4 md:w-4" />
			</div>
		);
	}

	if (mode === "offline") {
		return (
			<div className={cn("relative size-8 rounded-full md:size-10", className)}>
				<img
					src="/preset/avatar.webp" // Avatar
					alt="User avatar"
					className="rounded-full"
				/>
				<div className="absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-gray-400 md:h-4 md:w-4" />
			</div>
		);
	}

	// Default mode with dropdown menu
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="relative size-8 cursor-pointer rounded-full md:size-10"
				>
					<img
						src="/preset/avatar.webp"
						alt="User avatar"
						className="rounded-full"
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end">
				<DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
				<DropdownMenuGroup>
					<DropdownMenuItem>
						{t("profile")}
						<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						{t("billing")}
						<DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Link href={"/settings"} className="h-full w-full">
							{t("settings")}
						</Link>
						<DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						{t("keyboardShortcuts")}
						<DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>{t("team")}</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>{t("inviteUsers")}</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent>
								<DropdownMenuItem>{t("email")}</DropdownMenuItem>
								<DropdownMenuItem>{t("message")}</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem>{t("more")}</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>
					<DropdownMenuItem>
						{t("newTeam")}
						<DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem>{t("apiKey")}</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut}>
					{t("logout")}
					<DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
export default Avatar;
