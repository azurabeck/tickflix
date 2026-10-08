import type { Meta, StoryObj } from "@storybook/react-vite";
import ProfileStats from "@/components/organisms/ProfileStats";

const meta = { title: "Organisms/ProfileStats", component: ProfileStats, tags: ["autodocs"], args: { uid: "demo" } } satisfies Meta<typeof ProfileStats>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
