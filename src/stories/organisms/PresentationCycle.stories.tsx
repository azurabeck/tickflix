import type { Meta, StoryObj } from "@storybook/react-vite";
import PresentationCycle from "@/components/organisms/PresentationCycle";
import { NOTES_CYCLE } from "@/actions/presentation/cyclenotes";
import { CACHE_PROBLEM } from "@/actions/presentation/problemcache";
import { CONTEXT_PROBLEM } from "@/actions/presentation/problemcontext";
import { GEMINIKEY_PROBLEM } from "@/actions/presentation/problemgeminikey";
import { PROGRESS_CYCLE } from "@/actions/presentation/cycleprogress";
import { RENDER_CYCLE } from "@/actions/presentation/cyclerender";
import { FILTERS_CYCLE } from "@/actions/presentation/cyclefilters";
import { FOLLOWING_CYCLE } from "@/actions/presentation/cyclefollowing";
import { SUGGESTIONS_CYCLE } from "@/actions/presentation/cyclesuggestions";
import { TIMELINEAI_CYCLE } from "@/actions/presentation/cycletimelineai";
import { WATCHED_CYCLE } from "@/actions/presentation/cyclewatched";

const meta = {
  title: "Organisms/PresentationCycle",
  component: PresentationCycle,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ background: "#e9f0f4", padding: 24 }}>
        <Story />
      </div>
    ),
  ],
  args: { cycle: RENDER_CYCLE },
} satisfies Meta<typeof PresentationCycle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RenderCycle: Story = {};
export const WatchedCycle: Story = { args: { cycle: WATCHED_CYCLE } };
export const FollowingCycle: Story = { args: { cycle: FOLLOWING_CYCLE } };
export const FiltersCycle: Story = { args: { cycle: FILTERS_CYCLE } };
export const TimelineAiCycle: Story = { args: { cycle: TIMELINEAI_CYCLE } };
export const SuggestionsCycle: Story = { args: { cycle: SUGGESTIONS_CYCLE } };
export const ProgressCycle: Story = { args: { cycle: PROGRESS_CYCLE } };
export const NotesCycle: Story = { args: { cycle: NOTES_CYCLE } };
export const CacheProblem: Story = { args: { cycle: CACHE_PROBLEM } };
export const GeminiKeyProblem: Story = { args: { cycle: GEMINIKEY_PROBLEM } };
export const ContextProblem: Story = { args: { cycle: CONTEXT_PROBLEM } };
