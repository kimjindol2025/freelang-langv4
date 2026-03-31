// freelang init [name] - Initialize a new FreeLang project

import * as fs from "fs";
import * as path from "path";
import { stringifyTOML } from "./toml";

export async function initProject(projectName: string = "my-app"): Promise<void> {
  const projectPath = path.resolve(process.cwd(), projectName);

  // Check if directory already exists
  if (fs.existsSync(projectPath)) {
    console.error(`Error: Directory '${projectName}' already exists`);
    process.exit(1);
  }

  // Create project structure
  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(path.join(projectPath, "src"), { recursive: true });
  fs.mkdirSync(path.join(projectPath, "tests"), { recursive: true });

  // Create freelang.toml
  const tomlContent = stringifyTOML({
    package: {
      name: projectName,
      version: "0.1.0",
      entry: "src/main.fl",
    },
    dependencies: {},
    scripts: {
      test: "freelang tests/main.fl",
    },
  });

  fs.writeFileSync(path.join(projectPath, "freelang.toml"), tomlContent);

  // Create main.fl
  const mainContent = `// FreeLang v4 - ${projectName}

fn main() -> () {
  println("Hello from FreeLang!")
}

main()
`;
  fs.writeFileSync(path.join(projectPath, "src", "main.fl"), mainContent);

  // Create test file
  const testContent = `// Tests for ${projectName}

fn test_basic() -> bool {
  var x = 42
  x == 42
}

// Run: freelang tests/main.fl
`;
  fs.writeFileSync(path.join(projectPath, "tests", "main.fl"), testContent);

  // Create README.md
  const readmeContent = `# ${projectName}

A FreeLang v4 project.

## Build

\`\`\`bash
freelang run build
\`\`\`

## Test

\`\`\`bash
freelang run test
\`\`\`

## Run

\`\`\`bash
freelang src/main.fl
\`\`\`
`;
  fs.writeFileSync(path.join(projectPath, "README.md"), readmeContent);

  console.log(`✓ Created project '${projectName}' at ${projectPath}`);
  console.log("  - freelang.toml (project configuration)");
  console.log("  - src/main.fl (entry point)");
  console.log("  - tests/main.fl (test file)");
  console.log("  - README.md (documentation)");
  console.log("");
  console.log(`Run 'cd ${projectName} && freelang src/main.fl' to get started!`);
}
