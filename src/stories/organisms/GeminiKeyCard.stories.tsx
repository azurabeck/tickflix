import type { Meta, StoryObj } from "@storybook/react-vite";
import GeminiKeyCard from "@/components/organisms/GeminiKeyCard";

const meta = { title: "Organisms/GeminiKeyCard", component: GeminiKeyCard, tags: ["autodocs"] } satisfies Meta<typeof GeminiKeyCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
