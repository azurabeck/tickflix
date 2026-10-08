import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import PosterGridModal from "@/components/organisms/PosterGridModal";
import { MEDIA_ITEMS } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/PosterGridModal",
  component: PosterGridModal,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 560 } } },
  args: { title: "Em cartaz no Brasil", items: MEDIA_ITEMS, onClose: fn() },
} satisfies Meta<typeof PosterGridModal>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { items: null } };
export const WithError: Story = { args: { items: null, error: "Não foi possível carregar agora." } };
export const Empty: Story = { args: { items: [], emptyMessage: "Você ainda não marcou nada como visto." } };
