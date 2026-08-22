const fs = require('fs');
const path = require('path');

const modulesDir = path.join(process.cwd(), 'src', 'modules');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.name.endsWith('.controller.ts')) {
      continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Skip if already decorated
    if (content.includes('@ApiTags(')) {
      continue;
    }

    const folderName = path.basename(path.dirname(fullPath));

    const tag = folderName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Add Swagger import
    if (!content.includes("@nestjs/swagger")) {
      content = content.replace(
        "from '@nestjs/common';",
        "from '@nestjs/common';\nimport { ApiBearerAuth, ApiTags } from '@nestjs/swagger';",
      );
    }

    const isAuthController = folderName === 'auth';
    const decorators = isAuthController
      ? `@ApiTags('${tag}')\n@Controller(`
      : `@ApiTags('${tag}')\n@ApiBearerAuth()\n@Controller(`;

    content = content.replace('@Controller(', decorators);

    fs.writeFileSync(fullPath, content, 'utf8');

    console.log(`✔ Updated ${folderName}`);
  }
}

walk(modulesDir);

console.log('\n✅ All controllers updated.');