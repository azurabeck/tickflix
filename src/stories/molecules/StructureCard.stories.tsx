import type { Meta, StoryObj } from "@storybook/react-vite";
import StructureCard from "@/components/molecules/StructureCard";

const meta = {
  title: "Molecules/StructureCard",
  component: StructureCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ background: "#e9f0f4", padding: "24px 24px 24px 64px", maxWidth: 440 }}>
        <Story />
      </div>
    ),
  ],
  args: { chip: "API", title: "Rotas serverless", text: "dashboard • series • gemini" },
} satisfies Meta<typeof StructureCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Dark: Story = { args: { dark: true, chip: "Service", title: "Integrações do app", text: "Firebase • TMDb • Gemini" } };
