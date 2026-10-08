import type { Meta, StoryObj } from "@storybook/react-vite";
import Avatar from "@/components/atoms/Avatar";

const meta = {
  title: "Atoms/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: { name: "Rebecca Souza", size: 48 },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};
export const WithImage: Story = { args: { imageUrl: "https://image.tmdb.org/t/p/w185/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg" } };
export const Large: Story = { args: { size: 96 } };
