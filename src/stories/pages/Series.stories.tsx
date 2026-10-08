import type { Meta, StoryObj } from "@storybook/react-vite";
import Series from "@/pages/private/series";

const meta = { title: "Pages/Series", component: Series, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Series>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
