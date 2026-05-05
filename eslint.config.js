// eslint.config.js
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // ✅ Permitir variables no usadas (solo warn, no error)
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // ✅ Permitir console.log en desarrollo
      "no-console": "off",
      // ✅ Desactivar reglas molestas
      "no-prototype-builtins": "off",
      "no-undef": "off",
      // ✅ Permitir parámetros vacíos
      "no-empty-pattern": "warn",
    },
  },
  {
    files: ["**/__tests__/**/*.mjs", "**/*.test.mjs"],
    languageOptions: {
      globals: {
        ...globals.jest,
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
  },
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      ".aws-sam/**",
      "docs/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.cjs",
    ],
  },
];
