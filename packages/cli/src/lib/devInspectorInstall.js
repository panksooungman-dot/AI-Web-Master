const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// __dirname 기준(이 CLI 패키지가 실제로 설치된 위치 기준) — 특정 저장소가
// 로컬에 클론되어 있는지 여부와 무관하게 항상 올바른 경로를 가리킨다.
const VENDOR_DEV_INSPECTOR = path.join(__dirname, "..", "..", "vendor", "dev-inspector");

/**
 * 대상 프로젝트에 Visual Editor(@cnbiz/dev-inspector)를 자동으로 연결한다.
 * 이미 연결되어 있으면 아무것도 하지 않는다(멱등). scripts/ai-business-os.ps1의
 * Install-AIBizDevInspector와 동일한 로직의 Node.js 버전이며, 특정 저장소
 * 경로가 아니라 이 CLI 패키지에 번들된 vendor 사본을 사용한다.
 */
function installDevInspector(projectPath, log) {
  if (!fs.existsSync(VENDOR_DEV_INSPECTOR)) {
    log.warn("Visual Editor", `번들된 공유 패키지를 찾을 수 없어 건너뜁니다 (${VENDOR_DEV_INSPECTOR})`);
    return;
  }

  const appDir = path.join(projectPath, "app");
  const packageJsonPath = path.join(projectPath, "package.json");
  if (!fs.existsSync(appDir) || !fs.existsSync(packageJsonPath)) {
    log.warn("Visual Editor", "App Router(app/) 구조가 아니어서 건너뜁니다");
    return;
  }

  const apiRouteDir = path.join(projectPath, "app", "api", "dev-inspector");
  if (fs.existsSync(path.join(apiRouteDir, "save-text", "route.ts"))) {
    log.ok("Visual Editor", "이미 연결되어 있음 (건너뜀)");
    return;
  }

  log.info("[devmode] Visual Editor(@cnbiz/dev-inspector)를 이 프로젝트에 처음 연결합니다...");

  // Windows에서 npm.cmd는 shell 없이는 spawn이 EINVAL로 실패한다. shell:true일
  // 때 args 배열을 그대로 넘기면 Deprecation 경고가 뜨므로 하나의 문자열로 합친다
  // (경로에 공백이 있을 수 있어 각 인자를 개별적으로 따옴표로 감싼다).
  const installResult =
    process.platform === "win32"
      ? spawnSync(`npm.cmd install "${VENDOR_DEV_INSPECTOR}" --save`, {
          cwd: projectPath,
          encoding: "utf-8",
          shell: true,
        })
      : spawnSync("npm", ["install", VENDOR_DEV_INSPECTOR, "--save"], {
          cwd: projectPath,
          encoding: "utf-8",
        });
  if (installResult.status !== 0) {
    log.error("Visual Editor", `npm install 실패 - 수동으로 실행: npm install "${VENDOR_DEV_INSPECTOR}"`);
    return;
  }
  log.ok("Visual Editor", "npm install 완료 (@cnbiz/dev-inspector)");

  const handlers = {
    "save-text": "saveTextHandler",
    "save-image": "saveImageHandler",
    "save-style": "saveStyleHandler",
  };
  for (const [route, handlerName] of Object.entries(handlers)) {
    const routeDir = path.join(apiRouteDir, route);
    fs.mkdirSync(routeDir, { recursive: true });
    const content = [
      "// ai devmode(AI Business OS)가 자동 생성한 wiring 파일. 실제 구현은",
      "// @cnbiz/dev-inspector/src/server(공유 패키지)에 있다.",
      `export { ${handlerName} as POST } from "@cnbiz/dev-inspector/src/server";`,
      "",
    ].join("\n");
    fs.writeFileSync(path.join(routeDir, "route.ts"), content, "utf-8");
  }
  log.ok("Visual Editor", "API 라우트 3개 생성 (app/api/dev-inspector/*)");

  const babelCandidates = ["babel.config.js", ".babelrc", ".babelrc.js", "babel.config.mjs"];
  const existingBabel = babelCandidates.find((f) => fs.existsSync(path.join(projectPath, f)));
  if (existingBabel) {
    log.warn("Visual Editor", `기존 babel 설정이 있어 자동 생성을 건너뜁니다 (${existingBabel})`);
    log.dim("   수동 등록: require.resolve('@cnbiz/dev-inspector/src/babel-plugin-component-marker')");
  } else {
    const pluginPath = path
      .join(VENDOR_DEV_INSPECTOR, "src", "babel-plugin-component-marker.js")
      .replace(/\\/g, "/");
    const babelConfig = [
      "module.exports = {",
      '  presets: ["next/babel"],',
      `  plugins: ["${pluginPath}"],`,
      "};",
      "",
    ].join("\n");
    fs.writeFileSync(path.join(projectPath, "babel.config.js"), babelConfig, "utf-8");
    log.ok("Visual Editor", "babel.config.js 생성 - data-component-id를 컴포넌트 루트에 자동 주입합니다");
    log.dim("   (참고: Next.js가 이제 SWC 대신 Babel로 컴파일합니다)");
  }

  const nextConfigCandidates = ["next.config.ts", "next.config.js", "next.config.mjs"];
  const nextConfigFile = nextConfigCandidates
    .map((f) => path.join(projectPath, f))
    .find((f) => fs.existsSync(f));

  if (!nextConfigFile) {
    log.warn("Visual Editor", "next.config 파일을 찾지 못했습니다 - transpilePackages를 수동으로 설정하세요");
  } else {
    const content = fs.readFileSync(nextConfigFile, "utf-8");
    if (content.includes("@cnbiz/dev-inspector")) {
      log.ok("Visual Editor", "next.config에 이미 설정되어 있음");
    } else if (/transpilePackages\s*:\s*\[/.test(content)) {
      log.warn("Visual Editor", "next.config에 기존 transpilePackages가 있어 자동 추가를 건너뜁니다");
      log.dim(`   수동으로 배열에 "@cnbiz/dev-inspector" 추가 (${nextConfigFile})`);
    } else {
      const matches = [...content.matchAll(/=\s*\{/g)];
      if (matches.length === 1) {
        const insertPos = matches[0].index + matches[0][0].length;
        const updated =
          content.slice(0, insertPos) +
          '\n  transpilePackages: ["@cnbiz/dev-inspector"],' +
          content.slice(insertPos);
        fs.writeFileSync(nextConfigFile, updated, "utf-8");
        log.ok("Visual Editor", `next.config에 transpilePackages 자동 추가 (${nextConfigFile})`);
      } else {
        log.warn("Visual Editor", "next.config 형식을 자동으로 인식하지 못해 건너뜁니다");
        log.dim('   수동으로 추가: transpilePackages: ["@cnbiz/dev-inspector"]');
      }
    }
  }

  const layoutCandidates = ["app/layout.tsx", "app/layout.jsx", "src/app/layout.tsx"];
  const layoutFile = layoutCandidates
    .map((f) => path.join(projectPath, f))
    .find((f) => fs.existsSync(f));

  if (!layoutFile) {
    log.warn("Visual Editor", "app/layout.tsx를 찾지 못했습니다 - 수동으로 <DevInspectorOverlay /> 추가 필요");
  } else {
    const content = fs.readFileSync(layoutFile, "utf-8");
    if (content.includes("DevInspectorOverlay")) {
      log.ok("Visual Editor", "layout에 이미 DevInspectorOverlay가 있음");
    } else {
      const bodyCloseMatches = [...content.matchAll(/<\/body>/g)];
      if (bodyCloseMatches.length === 1) {
        const insertPos = bodyCloseMatches[0].index;
        const updated =
          'import { DevInspectorOverlay } from "@cnbiz/dev-inspector";\n' +
          content.slice(0, insertPos) +
          "<DevInspectorOverlay />\n      " +
          content.slice(insertPos);
        fs.writeFileSync(layoutFile, updated, "utf-8");
        log.ok("Visual Editor", `${layoutFile} 에 <DevInspectorOverlay /> 자동 추가`);
      } else {
        log.warn("Visual Editor", "layout.tsx에서 </body> 위치를 안전하게 찾지 못해 건너뜁니다");
        log.dim(`   수동으로 </body> 앞에 <DevInspectorOverlay /> 추가 (${layoutFile})`);
      }
    }
  }

  log.info("[devmode] Visual Editor 연결 완료.");
}

module.exports = { installDevInspector };
