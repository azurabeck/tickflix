import type { Meta, StoryObj } from "@storybook/react-vite";
import qrCode from "@/assets/presentation/qrcode.jpg";
import PresentationHero from "@/components/organisms/PresentationHero";

const meta = {
  title: "Organisms/PresentationHero",
  component: PresentationHero,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { qrSrc: qrCode, onStructure: () => {}, onFeatures: () => {} },
} satisfies Meta<typeof PresentationHero>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
