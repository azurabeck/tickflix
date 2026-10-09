import { fileURLToPath, URL } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  async viteFinal(viteConfig) {
    // O Storybook não fala com Firebase nem usa a chave real do TMDb: tudo é simulado (ver .storybook/mocks).
    const mocks = fileURLToPath(new URL("./mocks", import.meta.url));
    const alias = viteConfig.resolve?.alias ?? {};
    viteConfig.resolve = {
      ...viteConfig.resolve,
      alias: [
        { find: "@/service/FirebaseSettings", replacement: `${mocks}/firebase.ts` },
        { find: /^\.\/FirebaseSettings$/, replacement: `${mocks}/firebase.ts` }, // imports relativos dentro de src/service
        { find: /^firebase\/firestore$/, replacement: `${mocks}/firestore.ts` },
        ...(Array.isArray(alias) ? alias : Object.entries(alias).map(([find, replacement]) => ({ find, replacement }))),
      ],
    };
    viteConfig.define = { ...viteConfig.define, "import.meta.env.VITE_TMDB_API_KEY": JSON.stringify("storybook") };
    return viteConfig;
  },
};

export default config;
