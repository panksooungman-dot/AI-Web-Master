/**
 * 계약서 PDF·이미지 저장 (브라우저 전용). 계약서 HTML을 A4 폭(794px)으로 그린 화면을 사진처럼 찍어 쪽 단위로 자른다.
 * 글자를 PDF에 따로 넣지 않고 화면에 보이는 그대로 찍기 때문에 한글이 깨지지 않는다(대신 PDF 안의 글자는 선택·검색되지 않는다).
 *
 * - 쪽 나누기: 문단·줄 사이에서만 자르고, 제목과 첫 줄·날짜와 서명란은 떨어지지 않게 한다. 사유서는 항상 새 쪽에서 시작한다.
 * - 로고 워터마크는 모든 쪽에 넣는다(본문 한 곳에만 한 번 들어가면 여러 쪽에서 어색해서 쪽마다 직접 그린다).
 */

export const PAGE_W = 794;
export const PAGE_H = 1123;
const MARGIN_Y = 52;
const SCALE = 2;
const WATERMARK_SRC = "/images/logo.png";

type Cut = { top: number; forced: boolean };

/** 이 요소 앞에서는 쪽을 나누면 안 되는가? (제목 바로 뒤의 첫 줄, 서명란 줄들) */
function keepWithPrevious(el: Element, prev: Element | null): boolean {
  if (el.classList.contains("ln") || el.classList.contains("who") || el.classList.contains("gap")) return true;
  return el.classList.contains("sub") && !!prev && prev.tagName === "P";
}

/** 쪽을 나눌 수 있는 위치(문서 맨 위 기준 px). 사유서(.insapp) 앞은 반드시 나눈다. */
export function collectCuts(paper: HTMLElement): Cut[] {
  const base = paper.getBoundingClientRect().top;
  const cuts: Cut[] = [];
  const walk = (parent: Element) => {
    let prev: Element | null = null;
    Array.from(parent.children).forEach((el) => {
      if (el.classList.contains("wm")) return;
      const top = el.getBoundingClientRect().top - base;
      if (el.classList.contains("insapp")) {
        cuts.push({ top, forced: true });
        walk(el);
      } else if (!keepWithPrevious(el, prev)) {
        cuts.push({ top, forced: false });
      }
      prev = el;
    });
  };
  walk(paper);
  return cuts.sort((a, b) => a.top - b.top);
}

/** 쪽 경계(문서 위에서부터의 px 구간)를 계산한다. 순수 계산이라 화면 없이도 시험할 수 있다. */
export function paginate(totalHeight: number, cuts: Cut[], contentHeight = PAGE_H - MARGIN_Y * 2): Array<[number, number]> {
  const pages: Array<[number, number]> = [];
  let pos = 0;
  let guard = 0;
  while (pos < totalHeight - 1 && guard++ < 50) {
    const limit = pos + contentHeight;
    if (totalHeight <= limit) {
      pages.push([pos, totalHeight]);
      break;
    }
    const forced = cuts.find((c) => c.forced && c.top > pos + 1 && c.top <= limit);
    const free = cuts.filter((c) => !c.forced && c.top > pos + 1 && c.top <= limit).pop();
    const at = forced ? forced.top : free ? free.top : limit; // 한 덩어리가 한 쪽보다 길면 어쩔 수 없이 중간을 자른다
    pages.push([pos, at]);
    pos = at;
  }
  return pages;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function imagesReady(root: HTMLElement): Promise<void> {
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map((img) => (img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = img.onerror = () => r(); }))),
  );
  await document.fonts?.ready;
}

/** 계약서 HTML → A4 쪽 캔버스들(워터마크 포함). */
export async function renderPages(html: string, watermark: boolean): Promise<HTMLCanvasElement[]> {
  const { default: html2canvas } = await import("html2canvas");
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px;background:#fff;pointer-events:none`;
  host.innerHTML = `<div class="paper cap">${html}</div>`;
  document.body.appendChild(host);
  try {
    const paper = host.firstElementChild as HTMLElement;
    // 쪽 여백은 쪽마다 직접 주므로 종이 위·아래 안쪽 여백은 없앤다. 배경은 투명하게 찍어 워터마크 위에 겹친다.
    paper.style.padding = "0 54px";
    paper.style.background = "transparent";
    await imagesReady(paper);

    const total = Math.ceil(paper.getBoundingClientRect().height);
    const ranges = paginate(total, collectCuts(paper));
    const logo = watermark ? await loadImage(WATERMARK_SRC) : null;

    const pages: HTMLCanvasElement[] = [];
    for (const [from, to] of ranges) {
      const slice = await html2canvas(paper, { scale: SCALE, backgroundColor: null, logging: false, useCORS: true, x: 0, y: from, width: PAGE_W, height: Math.max(1, to - from), windowWidth: PAGE_W });
      const page = document.createElement("canvas");
      page.width = PAGE_W * SCALE;
      page.height = PAGE_H * SCALE;
      const ctx = page.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, page.width, page.height);
      if (logo) {
        const w = PAGE_W * 0.7 * SCALE;
        const h = (logo.naturalHeight / logo.naturalWidth) * w;
        ctx.globalAlpha = 0.15;
        ctx.drawImage(logo, (page.width - w) / 2, (page.height - h) / 2.3, w, h);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(slice, 0, MARGIN_Y * SCALE);
      pages.push(page);
    }
    return pages;
  } finally {
    host.remove();
  }
}

/** 파일 이름에 쓸 수 없는 글자를 뺀다. */
export const safeFileName = (s: string): string => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim().slice(0, 40) || "계약서";

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function downloadPdf(html: string, watermark: boolean, filename: string): Promise<void> {
  const pages = await renderPages(html, watermark);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pages.forEach((p, i) => {
    if (i > 0) doc.addPage();
    doc.addImage(p.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297, undefined, "FAST");
  });
  save(doc.output("blob"), filename);
}

/** 모든 쪽을 세로로 이어 붙인 PNG 한 장으로 저장한다. */
export async function downloadImage(html: string, watermark: boolean, filename: string): Promise<void> {
  const pages = await renderPages(html, watermark);
  const out = document.createElement("canvas");
  out.width = pages[0].width;
  out.height = pages.reduce((sum, p) => sum + p.height, 0);
  const ctx = out.getContext("2d")!;
  let y = 0;
  for (const p of pages) {
    ctx.drawImage(p, 0, y);
    y += p.height;
  }
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("이미지를 만들지 못했습니다.");
  save(blob, filename);
}
