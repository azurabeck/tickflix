import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import RatingInput from "@/components/atoms/RatingInput";

const Demo = ({ initial, disabled }: { initial: number | null; disabled?: boolean }) => {
  const [rating, setRating] = useState<number | null>(initial);
  return <RatingInput rating={rating} onChange={setRating} disabled={disabled} disabledHint="Marque como visto para avaliar" />;
};

const meta = { title: "Atoms/RatingInput", component: RatingInput, tags: ["autodocs"], args: { rating: null, onChange: () => undefined } } satisfies Meta<typeof RatingInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { render: () => <Demo initial={null} /> };
export const Rated: Story = { render: () => <Demo initial={8.5} /> };
export const Disabled: Story = { render: () => <Demo initial={null} disabled /> };
