// freelang run <script> - Run script from freelang.toml

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { parseTOML } from "./toml";

export async function runScript(
  scriptName: string,
  projectRoot: string,
): Promise<void> {
  const tomlPath = path.join(projectRoot, "freelang.toml");

  // Read freelang.toml
  if (!fs.existsSync(tomlPath)) {
    console.error("Error: freelang.toml not found");
    process.exit(1);
  }

  const tomlContent = fs.readFileSync(tomlPath, "utf-8");
  const tomlData = parseTOML(tomlContent);

  // Get script
  if (!tomlData.scripts || !tomlData.scripts[scriptName]) {
    console.error(`Error: Script '${scriptName}' not found in freelang.toml`);
    console.log("Available scripts:");
    if (tomlData.scripts) {
      for (const [name] of Object.entries(tomlData.scripts)) {
        console.log(`  - ${name}`);
      }
    }
    process.exit(1);
  }

  const scriptCommand = tomlData.scripts[scriptName];

  console.log(`> ${scriptCommand}`);
  console.log("");

  try {
    execSync(scriptCommand, {
      cwd: projectRoot,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Script failed");
    process.exit(1);
  }
}
