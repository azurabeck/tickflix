import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import EditionDetail from "@/components/organisms/EditionDetail";
import { OSCAR_CONFIG } from "@/actions/awards/editions";
import { AWARD_EDITIONS } from "@/stories/_support/fixtures";

const meta = {
  title: "Organisms/EditionDetail",
  component: EditionDetail,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={{ "--awards-accent": "#d4af37", background: "linear-gradient(307deg, #242329 3%, #51279b 64%)", padding: 32, minHeight: 320 } as React.CSSProperties}><Story /></div>],
  args: { config: OSCAR_CONFIG, edition: AWARD_EDITIONS[0], uid: "demo", onBack: fn(), onSelectNominee: fn(), onOpenAddData: fn() },
} satisfies Meta<typeof EditionDetail>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithNominees: Story = {};
export const WithoutData: Story = { args: { edition: AWARD_EDITIONS[1] } };
export const SignedOut: Story = { args: { uid: null } };
