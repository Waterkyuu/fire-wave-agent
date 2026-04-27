import { cn } from "@/lib/utils";

type AmbientGlowProps = {
	className?: string;
	size?: "default" | "md" | "sm";
};

const sizeVariants = {
	default: {
		container: "w-full h-32 md:w-[38rem] md:h-36 lg:w-[45rem] lg:h-40",
	},
	md: {
		container: "w-full h-24 md:w-24 md:h-28 lg:w-28 lg:h-32",
	},
	sm: {
		container: "w-full h-20 md:w-72 md:h-24 lg:w-80 lg:h-28",
	},
};

const AmbientGlow = ({ className, size = "default" }: AmbientGlowProps) => {
	return (
		<div
			className={cn(
				"-z-10 pointer-events-none absolute",
				sizeVariants[size].container,
				className,
			)}
		>
			{/* Blue gradient glow effect */}
			<div
				className="absolute inset-0 rounded-[2.5rem]"
				style={{
					background:
						"radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.2) 40%, transparent 70%)",
					filter: "blur(40px)",
				}}
			/>
			{/* Secondary blue glow for enhanced effect */}
			<div
				className="absolute inset-0 rounded-[2.5rem]"
				style={{
					background:
						"radial-gradient(circle, rgba(96, 165, 250, 0.3) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 80%)",
					filter: "blur(60px)",
				}}
			/>
		</div>
	);
};

export default AmbientGlow;
