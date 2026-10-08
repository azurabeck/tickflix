import type { Meta, StoryObj } from "@storybook/react-vite";
import HomeGroup from "@/components/atoms/HomeGroup";
import HomeSection from "@/components/atoms/HomeSection";

const meta = {
  title: "Atoms/HomeGroup",
  component: HomeGroup,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    children: (
      <>
        <HomeSection title="Últimos vistos">Seção 1</HomeSection>
        <HomeSection title="Em cartaz">Seção 2</HomeSection>
      </>
    ),
  },
} satisfies Meta<typeof HomeGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
