import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import MajorReleasesModal from "@/components/organisms/MajorReleasesModal";
import { RELEASES } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/MajorReleasesModal",
  component: MajorReleasesModal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 560 } } },
  args: { movies: RELEASES, error: null, onClose: fn() },
} satisfies Meta<typeof MajorReleasesModal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { movies: null } };
export const WithError: Story = { args: { movies: null, error: "Não foi possível carregar os lançamentos." } };
