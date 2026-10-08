import type { Meta, StoryObj } from "@storybook/react-vite";
import AppNav from "@/components/organisms/AppNav";

const meta = { title: "Organisms/AppNav", component: AppNav, tags: ["autodocs"], parameters: { layout: "fullscreen" }, } satisfies Meta<typeof AppNav>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
