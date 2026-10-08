import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import SuggestionRefreshCard from "@/components/atoms/SuggestionRefreshCard";

const meta = { title: "Atoms/SuggestionRefreshCard", component: SuggestionRefreshCard, tags: ["autodocs"], args: { onRefresh: fn() } } satisfies Meta<typeof SuggestionRefreshCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true } };
