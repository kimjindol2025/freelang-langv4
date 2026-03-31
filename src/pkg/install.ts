// freelang install <pkg> - Install a FreeLang package

import * as fs from "fs";
import * as path from "path";
import { parseTOML, stringifyTOML } from "./toml";

export async function installPackage(
  packageName: string,
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

  // Initialize dependencies if not present
  if (!tomlData.dependencies) {
    tomlData.dependencies = {};
  }

  // Check if package exists in registry
  const registryPath = path.join(__dirname, "../../packages/registry.json");
  if (!fs.existsSync(registryPath)) {
    console.error("Error: Package registry not found");
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  const pkg = registry.packages[packageName];

  if (!pkg) {
    console.error(`Error: Package '${packageName}' not found in registry`);
    process.exit(1);
  }

  // Add package to dependencies
  tomlData.dependencies[packageName] = {
    version: pkg.latest_version,
    path: `../../packages/${packageName}/${pkg.latest_version}/src`,
  };

  // Write updated freelang.toml
  const updatedToml = stringifyTOML(tomlData);
  fs.writeFileSync(tomlPath, updatedToml);

  console.log(`✓ Installed ${packageName}@${pkg.latest_version}`);
  console.log(
    `  Description: ${pkg.description}`,
  );
}
