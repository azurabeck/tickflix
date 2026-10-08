import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import AddDataModal from "@/components/organisms/AddDataModal";
import { OSCAR_CONFIG } from "@/actions/awards/editions";
import { AWARD_EDITIONS } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/AddDataModal",
  component: AddDataModal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 520 } } },
  args: { config: OSCAR_CONFIG, edition: AWARD_EDITIONS[1], onClose: fn(), onSaved: fn() },
} satisfies Meta<typeof AddDataModal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
