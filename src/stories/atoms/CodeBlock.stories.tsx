import type { Meta, StoryObj } from "@storybook/react-vite";
import CodeBlock from "@/components/atoms/CodeBlock";

const meta = {
  title: "Atoms/CodeBlock",
  component: CodeBlock,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ padding: 24, maxWidth: 640, height: 200 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    firstLine: 12,
    code: '// Soma dois números\nexport const soma = (a: number, b: number): number => {\n  const total = a + b;\n  return total; // "pronto"\n};',
  },
} satisfies Meta<typeof CodeBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
