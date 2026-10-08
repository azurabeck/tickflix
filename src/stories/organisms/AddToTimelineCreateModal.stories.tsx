import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import AddToTimelineCreateModal from "@/components/organisms/AddToTimelineCreateModal";

const meta = {
  title: "Organisms/AddToTimelineCreateModal",
  component: AddToTimelineCreateModal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 560 } } },
  args: { uid: "demo", initialMovie: { id: 27205, mediaType: "movie", title: "A Origem", posterPath: "/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg" }, onClose: fn(), onSaved: fn() },
} satisfies Meta<typeof AddToTimelineCreateModal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
