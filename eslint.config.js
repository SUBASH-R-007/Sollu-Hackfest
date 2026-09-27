import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "playwright-report/**",
      "test-results/**",
      ".cache/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    ignores: ["apps/web/src/features/audio/**", "**/*.test.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        "Audio",
        "AudioContext",
        "webkitAudioContext",
        "speechSynthesis",
        "SpeechSynthesisUtterance",
      ],
      "no-restricted-imports": [
        "error",
        { patterns: ["howler", "tone", "wavesurfer.js"] },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Audio']",
          message: "All audio output belongs in features/audio.",
        },
        {
          selector:
            "MemberExpression[property.name=/^(Audio|AudioContext|webkitAudioContext|speechSynthesis|SpeechSynthesisUtterance)$/]",
          message: "Use the central audio module.",
        },
      ],
    },
  },
);
