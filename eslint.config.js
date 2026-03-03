const js = require("@eslint/js");

module.exports = [
  {
    ignores: ["node_modules/**", "content/**", "docs/**"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.js", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        module: "readonly",
        require: "readonly",
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        global: "readonly",
        globalThis: "readonly",
        root: "readonly",
        window: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        Math: "readonly",
        Date: "readonly",
      },
    },
    rules: {
      "no-redeclare": "off",
      "no-empty": "off",
      "no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
    },
  },
];
