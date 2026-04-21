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

	it("keeps waiting for the chart asset instead of dumping raw chart JSON", () => {
		jotaiStore.set(workspaceChartAtom, {
			chart: {
				type: "line",
				title: "Monthly Sales Amount Trend (2024)",
				elements: [
					{
						label: "Sales Amount",
						points: [["2024-01-01T00:00:00", 95795]],
					},
				],
			},
			generatedAt: Date.now(),
			title: "Monthly Sales Amount Trend (2024)",
			toolCallId: "tool-2",
		});

		render(<ChartPanel />);

		expect(screen.getByText("Waiting for chart output...")).toBeInTheDocument();
		expect(screen.queryByText(/"type": "line"/)).not.toBeInTheDocument();
	});
});
