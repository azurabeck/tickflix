import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Modal from "@/components/atoms/Modal";

const meta = {
  title: "Atoms/Modal",
  component: Modal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 420 } } },
  args: { onClose: fn(), title: "Título do modal", size: "md", children: <p>Conteúdo do modal.</p> },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] }, scroll: { control: "inline-radio", options: ["panel", "content"] } },
} satisfies Meta<typeof Modal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {};
export const Small: Story = { args: { size: "sm" } };
export const ExtraLarge: Story = { args: { size: "xl" } };
export const ContentScroll: Story = {
  args: { scroll: "content", children: <div style={{ overflowY: "auto" }}>{Array.from({ length: 40 }, (_, i) => <p key={i}>Linha {i + 1}</p>)}</div> },
};
