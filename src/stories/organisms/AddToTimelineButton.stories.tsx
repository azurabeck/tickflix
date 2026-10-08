import type { Meta, StoryObj } from "@storybook/react-vite";
import AddToTimelineButton from "@/components/organisms/AddToTimelineButton";

const meta = {
  title: "Organisms/AddToTimelineButton",
  component: AddToTimelineButton,
  tags: ["autodocs"],
  args: { uid: "demo", movie: { id: 27205, mediaType: "movie", title: "A Origem", posterPath: "/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg" } },
  decorators: [(Story) => <div style={{ minHeight: 160 }}><Story /></div>],
} satisfies Meta<typeof AddToTimelineButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SignedIn: Story = {};
export const SignedOut: Story = { args: { uid: null } };
