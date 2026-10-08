import type { Meta, StoryObj } from "@storybook/react-vite";
import PresentationTabs from "@/components/organisms/PresentationTabs";
import { usePresentationTabs } from "@/actions/presentation/tabs";

const Demo = () => <PresentationTabs menu={usePresentationTabs()} />;

const meta = {
  title: "Organisms/PresentationTabs",
  component: Demo,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ padding: 32, minHeight: 280 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
