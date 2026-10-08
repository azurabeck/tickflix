import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import EditionGrid from "@/components/organisms/EditionGrid";
import { AWARD_EDITIONS } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/EditionGrid",
  component: EditionGrid,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={{ "--awards-accent": "#d4af37", background: "linear-gradient(307deg, #242329 3%, #51279b 64%)", padding: 32, minHeight: 320 } as React.CSSProperties}><Story /></div>],
  args: { editions: AWARD_EDITIONS, onSelect: fn() },
} satisfies Meta<typeof EditionGrid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
