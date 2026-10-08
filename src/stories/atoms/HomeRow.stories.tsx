import type { Meta, StoryObj } from "@storybook/react-vite";
import HomeRow from "@/components/atoms/HomeRow";

const box = (text: string) => <div style={{ background: "#d0c6e6", padding: 24, borderRadius: 8 }}>{text}</div>;

const meta = {
  title: "Atoms/HomeRow",
  component: HomeRow,
  tags: ["autodocs"],
  args: { children: <>{box("Bloco A")}{box("Bloco B")}{box("Bloco C")}</>, columns: "1fr 1fr 1fr" },
} satisfies Meta<typeof HomeRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeColumns: Story = {};
export const TwoColumns: Story = { args: { columns: "2fr 1fr", children: <>{box("Principal")}{box("Lateral")}</> } };
