import type { Meta, StoryObj } from "@storybook/react-vite";
import Anime from "@/pages/private/anime";

const meta = { title: "Pages/Anime", component: Anime, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Anime>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
