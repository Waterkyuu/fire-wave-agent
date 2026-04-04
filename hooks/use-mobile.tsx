import { useEffect, useState } from "react";

export const useIsMobile = (breakpoint = 768) => {
	const [isSmallScreen, setIsSmallScreen] = useState(false);

	useEffect(() => {
		const handleResize = () => {
			setIsSmallScreen(window.innerWidth < breakpoint);
		};

		// 立即设置初始值
		handleResize();

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [breakpoint]);

	return isSmallScreen;
};
