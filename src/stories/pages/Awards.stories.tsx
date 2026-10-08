import type { Meta, StoryObj } from "@storybook/react-vite";
import AwardPage from "@/pages/private/awards";
import { OSCAR_CONFIG } from "@/actions/awards/editions";

const meta = { title: "Pages/Awards", component: AwardPage, parameters: { layout: "fullscreen" }, args: { config: OSCAR_CONFIG } } satisfies Meta<typeof AwardPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Oscar: Story = {};
