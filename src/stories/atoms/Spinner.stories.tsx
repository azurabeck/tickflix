import type { Meta, StoryObj } from "@storybook/react-vite";
import Spinner from "@/components/atoms/Spinner";

const meta = { title: "Atoms/Spinner", component: Spinner, tags: ["autodocs"], args: { size: 24 } } satisfies Meta<typeof Spinner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { size: 48 } };
