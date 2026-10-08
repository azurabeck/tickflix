import type { Meta, StoryObj } from "@storybook/react-vite";
import Auth from "@/pages/public/auth";

const meta = { title: "Pages/Auth", component: Auth, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Auth>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
