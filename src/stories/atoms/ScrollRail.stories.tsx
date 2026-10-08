import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import ScrollRail from "@/components/atoms/ScrollRail";
import MediaCard from "@/components/molecules/MediaCard";
import { useScrollRail } from "@/actions/helpers/scrollrail";
import { MEDIA_ITEMS } from "@/stories/_support/fixtures";

const Demo = () => {
  const rail = useScrollRail([]);
  return (
    <ScrollRail rail={rail}>
      {MEDIA_ITEMS.map((item) => (
        <MediaCard key={item.id} item={item} isOpen={false} onSelect={fn()} />
      ))}
    </ScrollRail>
  );
};

const meta = { title: "Atoms/ScrollRail", component: ScrollRail, tags: ["autodocs"] } satisfies Meta<typeof ScrollRail>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <Demo />, args: { rail: {} as never, children: null } };
