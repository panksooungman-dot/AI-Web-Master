export interface ComponentMarker {
  "data-component-id": string;
  "data-component-file": string;
  "data-component-label"?: string;
}

/**
 * Visual Editor(DevInspectorOverlay)가 DOM 요소에서 역으로 컴포넌트명·파일
 * 경로를 찾아낼 수 있도록 붙이는 표준 마커.
 * 루트 DOM 요소에 스프레드로 적용한다: <section {...componentMarker(...)}>
 *
 * `label`(선택)은 비개발자도 알아볼 수 있는 화면 표시용 이름이다(예: "메인 히어로").
 * 생략하면 오버레이가 `id`를 그대로 보여준다 — 개발자 도구(components/developer/**)처럼
 * 원래 기술적인 이름이 화면 그대로 보여도 무방한 곳에서는 굳이 지정하지 않아도 된다.
 * 파일 경로(`data-component-file`)는 저장 API가 실제로 파일을 찾는 데 필요한 값이라
 * 항상 유지하지만, 오버레이 UI 자체는 이 값을 사람에게 노출하지 않는다.
 *
 * 수동으로 호출하는 대신 babel-plugin-component-marker를 통해 빌드 시점에
 * 자동으로 주입할 수도 있다(새 프로젝트에서 코드 수정 없이 쓰기 위한 경로).
 */
export function componentMarker(id: string, file: string, label?: string): ComponentMarker {
  return {
    "data-component-id": id,
    "data-component-file": file,
    ...(label ? { "data-component-label": label } : {}),
  };
}
