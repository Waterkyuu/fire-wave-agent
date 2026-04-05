import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

const NotFound = () => {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
			<div className="flex flex-col items-center gap-8 text-center">
				<h1 className="font-bold font-lora text-8xl text-foreground tracking-tight md:text-9xl">
					404
				</h1>

				<div className="h-px w-16 bg-foreground/20" />

				<p className="max-w-md text-lg text-muted-foreground">
					The page you are looking for does not exist or has been moved.
				</p>

				<Link
					href="/"
					className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 font-medium text-background text-sm transition-colors duration-200 hover:bg-foreground/80"
				>
					<ArrowLeftIcon className="size-4" />
					Back to Home
				</Link>
			</div>
		</div>
	);
};

export default NotFound;
