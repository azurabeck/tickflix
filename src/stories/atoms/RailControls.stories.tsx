import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import RailControls from "@/components/atoms/RailControls";
import { useScrollRail } from "@/actions/helpers/scrollrail";
import type { ComponentProps } from "react";

const Demo = (props: Omit<ComponentProps<typeof RailControls>, "rail">) => {
  const rail = useScrollRail([]);
  return <RailControls rail={rail} {...props} />;
};

const meta = { title: "Atoms/RailControls", component: RailControls, tags: ["autodocs"] } satisfies Meta<typeof RailControls>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithSeeAll: Story = { render: () => <Demo onSeeAll={fn()} />, args: { rail: {} as never } };
export const ArrowsOnly: Story = { render: () => <Demo />, args: { rail: {} as never } };
