import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Disable overly strict rule that blocks common "mounted" pattern
      // This pattern (useState + useEffect to detect client) is standard React
      // See: https://github.com/facebook/react/issues/26395
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
