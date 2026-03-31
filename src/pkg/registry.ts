// Package registry exploration

import * as fs from "fs";
import * as path from "path";

export interface Package {
  name: string;
  description: string;
  version: string;
  author?: string;
  repository?: string;
}

export interface PackageRegistry {
  packages: {
    [name: string]: {
      name: string;
      description: string;
      latest_version: string;
      versions: string[];
      author?: string;
      repository?: string;
    };
  };
}

export function getRegistry(): PackageRegistry {
  const registryPath = path.join(__dirname, "../../packages/registry.json");

  if (!fs.existsSync(registryPath)) {
    return { packages: {} };
  }

  try {
    const content = fs.readFileSync(registryPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return { packages: {} };
  }
}

export function listPackages(): void {
  const registry = getRegistry();

  if (Object.keys(registry.packages).length === 0) {
    console.log("No packages available in registry");
    return;
  }

  console.log("Available FreeLang packages:\n");

  for (const [name, pkg] of Object.entries(registry.packages)) {
    console.log(`${name}@${pkg.latest_version}`);
    console.log(`  ${pkg.description}`);
    if (pkg.author) {
      console.log(`  By: ${pkg.author}`);
    }
    console.log("");
  }
}

export function searchPackages(query: string): void {
  const registry = getRegistry();
  const results = Object.entries(registry.packages).filter(([name, pkg]) => {
    return (
      name.includes(query) ||
      pkg.description.toLowerCase().includes(query.toLowerCase())
    );
  });

  if (results.length === 0) {
    console.log(`No packages found matching '${query}'`);
    return;
  }

  console.log(`Found ${results.length} package(s) matching '${query}':\n`);

  for (const [name, pkg] of results) {
    console.log(`${name}@${pkg.latest_version}`);
    console.log(`  ${pkg.description}`);
    console.log("");
  }
}

export function getPackageInfo(name: string): void {
  const registry = getRegistry();
  const pkg = registry.packages[name];

  if (!pkg) {
    console.error(`Package '${name}' not found`);
    process.exit(1);
  }

  console.log(`${pkg.name}@${pkg.latest_version}`);
  console.log(`${pkg.description}`);
  if (pkg.author) {
    console.log(`Author: ${pkg.author}`);
  }
  if (pkg.repository) {
    console.log(`Repository: ${pkg.repository}`);
  }
  console.log(`Versions: ${pkg.versions.join(", ")}`);
}
