import type { Meta, StoryObj } from "@storybook/react-vite";
import UserMenu from "@/components/molecules/UserMenu";

const meta = {
  title: "Molecules/UserMenu",
  component: UserMenu,
  tags: ["autodocs"],
  decorators: [(Story) => <div style={{ background: "#3d2963", padding: 16, minHeight: 240, display: "flex", justifyContent: "flex-end" }}><Story /></div>],
} satisfies Meta<typeof UserMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
