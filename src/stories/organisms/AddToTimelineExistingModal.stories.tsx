import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import AddToTimelineExistingModal from "@/components/organisms/AddToTimelineExistingModal";

const meta = {
  title: "Organisms/AddToTimelineExistingModal",
  component: AddToTimelineExistingModal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 520 } } },
  args: { uid: "demo", movie: { id: 27205, mediaType: "movie", title: "A Origem", posterPath: "/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg" }, onClose: fn() },
} satisfies Meta<typeof AddToTimelineExistingModal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
