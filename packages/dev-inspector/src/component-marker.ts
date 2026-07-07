export interface ComponentMarker {
  "data-component-id": string;
  "data-component-file": string;
}

/**
 * Visual Editor(DevInspectorOverlay)가 DOM 요소에서 역으로 컴포넌트명·파일
 * 경로를 찾아낼 수 있도록 붙이는 표준 마커.
 * 루트 DOM 요소에 스프레드로 적용한다: <section {...componentMarker(...)}>
 *
 * 수동으로 호출하는 대신 babel-plugin-component-marker를 통해 빌드 시점에
 * 자동으로 주입할 수도 있다(새 프로젝트에서 코드 수정 없이 쓰기 위한 경로).
 */
export function componentMarker(id: string, file: string): ComponentMarker {
  return {
    "data-component-id": id,
    "data-component-file": file,
  };
}
