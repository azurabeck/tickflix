import type { Meta, StoryObj } from "@storybook/react-vite";
import EpisodicCatalog from "@/components/organisms/EpisodicCatalog";
import SeriesPage from "@/pages/private/series";
import AnimePage from "@/pages/private/anime";

// O layout é montado pelas páginas (cada uma com as suas sections); as stories mostram as duas.
const meta = { title: "Organisms/EpisodicCatalog", component: EpisodicCatalog, tags: ["autodocs"], parameters: { layout: "fullscreen" } } satisfies Meta<typeof EpisodicCatalog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Series: Story = { render: () => <SeriesPage />, args: {} as never };
export const Anime: Story = { render: () => <AnimePage />, args: {} as never };
