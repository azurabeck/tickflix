import type { Meta, StoryObj } from "@storybook/react-vite";
import Profile from "@/pages/private/profile";

const meta = { title: "Pages/Profile", component: Profile, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Profile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
