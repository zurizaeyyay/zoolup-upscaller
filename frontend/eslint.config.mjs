import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Disallow importing electron or Node built-ins in web code
      "no-restricted-imports": ["error", {
        paths: [
          { name: "electron", message: "Use window.electronAPI with runtime guard instead." },
          { name: "fs", message: "Node built-ins are not allowed in the web bundle." },
          { name: "path", message: "Node built-ins are not allowed in the web bundle." },
          { name: "child_process", message: "Node built-ins are not allowed in the web bundle." },
          { name: "net", message: "Node built-ins are not allowed in the web bundle." },
          { name: "tls", message: "Node built-ins are not allowed in the web bundle." },
          { name: "os", message: "Node built-ins are not allowed in the web bundle." }
        ]
      }],
    },
  },
];

export default eslintConfig;
