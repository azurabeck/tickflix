import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import CreateTimelineModal from "@/components/organisms/CreateTimelineModal";

const meta = {
  title: "Organisms/CreateTimelineModal",
  component: CreateTimelineModal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 560 } } },
  args: { uid: "demo", initialDescription: "filmes do Christopher Nolan", onClose: fn(), onSaved: fn() },
} satisfies Meta<typeof CreateTimelineModal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SeriesOnly: Story = { args: { categoryLock: "series", initialDescription: "séries de crime" } };
