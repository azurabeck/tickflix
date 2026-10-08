import type { Meta, StoryObj } from "@storybook/react-vite";
import Presentation from "@/pages/private/presentation";

const meta = { title: "Pages/Presentation", component: Presentation, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Presentation>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
