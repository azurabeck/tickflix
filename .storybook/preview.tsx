import type { Decorator, Preview } from "@storybook/react-vite";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConfirmProvider } from "@/contexts/Confirm";
import MediaCardsProvider from "@/contexts/MediaCards";
import "@/service/i18n";
import "@/theme.scss";
import { installFetchMock } from "../src/stories/_support/fetchMock";

installFetchMock();

// parameters.route = { entry, path } monta a página numa rota real (ex.: /franquias/:slug).
const withApp: Decorator = (Story, context) => {
  const route = context.parameters.route as { entry: string; path: string } | undefined;
  return (
    <MemoryRouter initialEntries={route ? [route.entry] : undefined} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConfirmProvider>
        <MediaCardsProvider>
          {route ? (
            <Routes>
              <Route path={route.path} element={<Story />} />
            </Routes>
          ) : (
            <Story />
          )}
        </MediaCardsProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );
};

const preview: Preview = {
  decorators: [withApp],
  parameters: {
    layout: "padded",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    options: { storySort: { order: ["Atoms", "Molecules", "Organisms", "Pages"] } },
  },
};

export default preview;
