import type { Meta, StoryObj } from "@storybook/react-vite";
import MovieDetailProviders from "@/components/molecules/MovieDetailProviders";
import { WATCH_PROVIDERS } from "@/stories/_support/fixtures";

const meta = {
  title: "Molecules/MovieDetailProviders",
  component: MovieDetailProviders,
  tags: ["autodocs"],
  args: { providersLoading: false, providers: WATCH_PROVIDERS },
} satisfies Meta<typeof MovieDetailProviders>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { providersLoading: true, providers: null } };
export const Unavailable: Story = { args: { providers: null } };
