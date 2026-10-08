import type { Meta, StoryObj } from "@storybook/react-vite";
import BestRatedOnRail from "@/components/organisms/BestRatedOnRail";
import { useSeriesDashboard } from "@/actions/series/dashboard";
import { useSeriesBestRatedOn } from "@/actions/series/bestratedon";
import { useAnimesDashboard } from "@/actions/animes/dashboard";
import { useAnimesBestRatedOn } from "@/actions/animes/bestratedon";

const SeriesDemo = () => <BestRatedOnRail dashboard={useSeriesDashboard()} provider={{ id: 8, label: "Netflix" }} titleKey="seriesPage.bestRatedOn" useBestRatedOn={useSeriesBestRatedOn} />;
const AnimesDemo = () => <BestRatedOnRail dashboard={useAnimesDashboard()} provider={{ id: 8, label: "Netflix" }} titleKey="animePage.bestRatedOn" useBestRatedOn={useAnimesBestRatedOn} />;

const meta = {
  title: "Organisms/BestRatedOnRail",
  component: BestRatedOnRail,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BestRatedOnRail>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Series: Story = { render: () => <SeriesDemo />, args: {} as never };
export const Anime: Story = { render: () => <AnimesDemo />, args: {} as never };
