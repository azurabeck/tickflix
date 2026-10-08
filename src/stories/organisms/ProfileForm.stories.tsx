import type { Meta, StoryObj } from "@storybook/react-vite";
import ProfileForm from "@/components/organisms/ProfileForm";

const meta = { title: "Organisms/ProfileForm", component: ProfileForm, tags: ["autodocs"] } satisfies Meta<typeof ProfileForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
