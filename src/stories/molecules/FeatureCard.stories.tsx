import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleCheck } from "lucide-react";
import FeatureCard from "@/components/molecules/FeatureCard";

const meta = {
  title: "Molecules/FeatureCard",
  component: FeatureCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ padding: 32, maxWidth: 560 }}>
        <Story />
      </div>
    ),
  ],
  args: { icon: <CircleCheck size={28} strokeWidth={2.4} color="#62D98A" />, title: "Acompanhe", text: "Marque tudo para não perder o que já assitiu" },
} satisfies Meta<typeof FeatureCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
