import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import NavTab from "@/components/atoms/NavTab";

const meta = {
  title: "Atoms/NavTab",
  component: NavTab,
  tags: ["autodocs"],
  args: { children: "Séries", to: "/series" },
  decorators: [(Story) => <div style={{ background: "#3d2963", padding: 16, display: "flex" }}><Story /></div>],
} satisfies Meta<typeof NavTab>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Link: Story = {};
export const Active: Story = { args: { active: true } };
export const Trigger: Story = { args: { to: undefined, onClick: fn(), expanded: false, children: "Premiações" } };
