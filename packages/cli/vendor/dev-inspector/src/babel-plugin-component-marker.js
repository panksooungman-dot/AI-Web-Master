const path = require("node:path");

/**
 * data-component-id / data-component-file를 컴포넌트 루트 JSX 요소에
 * 빌드 시점에 자동으로 주입하는 Babel 플러그인.
 *
 * lib/dev/component-marker.ts의 componentMarker()를 수동으로 스프레드하지
 * 않아도, 이 플러그인을 next.config의 babel 설정에 등록하면 새 프로젝트도
 * 코드 수정 없이 Visual Editor(DevInspectorOverlay)의 호버/클릭 선택이
 * 그대로 동작한다. `devmode`가 새 프로젝트를 열 때 자동으로 등록한다.
 *
 * 규칙 (안전 우선):
 *   - 소문자로 시작하는 순수 HTML 요소만 대상으로 한다(예: div, section, a, button).
 *     대문자로 시작하는 커스텀 컴포넌트(<Link>, <Image> 등)는 건드리지 않는다
 *     — 임의의 컴포넌트가 알 수 없는 prop을 실제 DOM으로 전달하지 않을 수 있어
 *       React 경고/오류로 이어질 위험이 있기 때문이다.
 *   - 컴포넌트 함수가 반환하는 최상위 JSX 요소에만 붙인다(내부의 모든 자식까지
 *     태그하면 너무 촘촘해져 기존 수동 마킹 방식과 시각적으로 달라진다).
 *   - 이미 data-component-id가 있으면(수동으로 componentMarker를 쓴 경우)
 *     건드리지 않는다 — 기존 프로젝트(ai-web-master)와 공존 가능.
 */

function findEnclosingComponentName(jsxElementPath) {
  let current = jsxElementPath.parentPath;
  while (current) {
    if (current.isFunctionDeclaration() && current.node.id) {
      return current.node.id.name;
    }
    if (
      current.isVariableDeclarator() &&
      current.node.id &&
      current.node.id.type === "Identifier" &&
      current.node.init &&
      (current.node.init.type === "ArrowFunctionExpression" ||
        current.node.init.type === "FunctionExpression")
    ) {
      return current.node.id.name;
    }
    if (current.isFunctionExpression() && current.node.id) {
      return current.node.id.name;
    }
    current = current.parentPath;
  }
  return null;
}

function isComponentRootJSX(jsxElementPath) {
  const parent = jsxElementPath.parentPath;
  if (!parent) return false;
  if (parent.isReturnStatement()) return true;
  if (parent.isArrowFunctionExpression() && parent.node.body === jsxElementPath.node) return true;
  return false;
}

module.exports = function devInspectorComponentMarker({ types: t }) {
  return {
    name: "dev-inspector-component-marker",
    visitor: {
      JSXOpeningElement(openingPath, state) {
        const nameNode = openingPath.node.name;
        if (!t.isJSXIdentifier(nameNode)) return;
        if (!/^[a-z]/.test(nameNode.name)) return;

        const jsxElementPath = openingPath.parentPath;
        if (!jsxElementPath || !isComponentRootJSX(jsxElementPath)) return;

        const hasMarker = openingPath.node.attributes.some(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name) &&
            attr.name.name === "data-component-id"
        );
        if (hasMarker) return;

        const componentName = findEnclosingComponentName(jsxElementPath);
        if (!componentName) return;

        const filename = state.filename;
        if (!filename) return;

        const relativeFile = path
          .relative(state.cwd || process.cwd(), filename)
          .replace(/\\/g, "/");

        openingPath.node.attributes.push(
          t.jsxAttribute(t.jsxIdentifier("data-component-id"), t.stringLiteral(componentName)),
          t.jsxAttribute(t.jsxIdentifier("data-component-file"), t.stringLiteral(relativeFile))
        );
      },
    },
  };
};
