import jotaiStore from "@/atoms";
import { workspaceChartAtom } from "@/atoms/chat";
import { render, screen } from "@testing-library/react";
import ChartPanel from "./chart-panel";

describe("ChartPanel", () => {
	it("renders chart image from downloadUrl when png payload is absent", () => {
		jotaiStore.set(workspaceChartAtom, {
			downloadUrl: "https://public.example/revenue.png",
			fileId: "chart-1",
			filename: "revenue.png",
			generatedAt: Date.now(),
			title: "Revenue trend",
			toolCallId: "tool-1",
		});

		render(<ChartPanel />);

		const image = screen.getByRole("img", { name: "Revenue trend" });
		expect(image).toHaveAttribute("src", "https://public.example/revenue.png");
	});
});
