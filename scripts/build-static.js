const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectRoot, "public");

fs.mkdirSync(outputDirectory, { recursive: true });
fs.copyFileSync(
  path.join(projectRoot, "index.html"),
  path.join(outputDirectory, "index.html")
);

console.log("Landing copiada para public/index.html");
