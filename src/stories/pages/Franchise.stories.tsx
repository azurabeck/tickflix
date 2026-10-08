import type { Meta, StoryObj } from "@storybook/react-vite";
import Franchise from "@/pages/private/franchise";

const meta = {
  title: "Pages/Franchise",
  component: Franchise,
  parameters: { layout: "fullscreen", route: { entry: "/franquias/marvel", path: "/franquias/:slug" } },
} satisfies Meta<typeof Franchise>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Marvel: Story = {};
