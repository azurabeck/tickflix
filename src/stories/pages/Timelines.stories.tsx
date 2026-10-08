import type { Meta, StoryObj } from "@storybook/react-vite";
import Timelines from "@/pages/private/timelines";

const meta = { title: "Pages/Timelines", component: Timelines, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Timelines>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Movies: Story = {};
export const Franchises: Story = { parameters: { route: { entry: "/timelines?category=franquias", path: "/timelines" } } };
