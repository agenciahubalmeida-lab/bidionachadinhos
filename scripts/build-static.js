const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectRoot, "public");

fs.mkdirSync(outputDirectory, { recursive: true });
fs.copyFileSync(
  path.join(projectRoot, "index.html"),
  path.join(outputDirectory, "index.html")
);
fs.cpSync(
  path.join(projectRoot, "assets"),
  path.join(outputDirectory, "assets"),
  { recursive: true }
);

console.log("Landing e imagens copiadas para public/");
