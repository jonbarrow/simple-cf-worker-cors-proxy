module.exports = {
  env: {
    browser: true,
  },
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  ignorePatterns: ["public/*", "dist/*", "/*.js", "/*.ts"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: "./",
  },
  settings: {
    "import/resolver": {
      typescript: {
        project: "./tsconfig.json",
      },
    },
  },
  plugins: ["@typescript-eslint", "import", "prettier"],
  rules: {
    "no-underscore-dangle": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "no-console": "off",
    "@typescript-eslint/no-this-alias": "off",
    "import/prefer-default-export": "off",
    "@typescript-eslint/no-empty-function": "off",
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": ["error"],
    "no-restricted-syntax": "off",
    "import/no-unresolved": ["error", { ignore: ["^virtual:"] }],
    "consistent-return": "off",
    "no-continue": "off",
    "no-eval": "off",
    "no-await-in-loop": "off",
    "no-nested-ternary": "off",
    "prefer-destructuring": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        ts: "never",
        tsx: "never",
      },
    ]
  },
}
