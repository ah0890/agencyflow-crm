import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Next.js recommended rules plus the TypeScript set.
 *
 * eslint-config-next 16 ships flat configs directly, so they are spread in
 * rather than wrapped in FlatCompat. Generated and build output are ignored -
 * they are machine-written and not ours to lint.
 */
const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "src/generated/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // The form dialogs deliberately reset only when `open` changes; adding
      // the whole record to the dependency list would reset on every render.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default config;
