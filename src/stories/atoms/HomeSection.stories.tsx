import type { Meta, StoryObj } from "@storybook/react-vite";
import HomeSection from "@/components/atoms/HomeSection";
import FilterChips from "@/components/atoms/FilterChips";

const meta = {
  title: "Atoms/HomeSection",
  component: HomeSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { title: "Últimos vistos", children: <p>Conteúdo da seção.</p> },
  argTypes: { variant: { control: "inline-radio", options: ["default", "purple"] } },
} satisfies Meta<typeof HomeSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Purple: Story = { args: { variant: "purple" } };
export const Loading: Story = { args: { loading: true } };
export const WithError: Story = { args: { error: "Não foi possível carregar agora." } };
export const WithToolbar: Story = {
  args: { toolbar: <FilterChips options={[{ value: "a", label: "Setembro 2026" }, { value: "b", label: "Outubro 2026" }]} active={["a"]} onToggle={() => undefined} /> },
};
