#!/usr/bin/env node
/**
 * 모든 CSS / JS 를 index.html 안에 끼워 넣어 단일 HTML 파일을 만든다.
 *
 *   node tools/build-single.js            -> dist/index.html (그대로 열면 되는 단일 파일)
 *   node tools/build-single.js --body 경로 -> <html>/<head>/<body> 없이 본문만 (아티팩트용)
 *
 * 단일 파일에는 assets/ 폴더가 없으므로 외부 스프라이트 시트 로딩은 건너뛴다.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');

// CSS 인라인
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) =>
  `<style>\n${read(href).trim()}\n</style>`);

// JS 인라인 (순서 유지)
let first = true;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const flag = first ? '<script>window.DFZ_SINGLE_FILE = true;</script>\n' : '';
  first = false;
  return `${flag}<script>\n${read(src).trim()}\n</script>`;
});

const outArg = process.argv.indexOf('--body');
if (outArg !== -1) {
  // 아티팩트용 : 문서 뼈대를 제거하고 본문만 남긴다
  // 아티팩트 제목은 설명 없이 이름만 사용한다
  const rawTitle = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'DRAGON FIGHTER Z';
  const title = rawTitle.split(' - ')[0].trim();
  const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  const styles = [...html.matchAll(/<style>[\s\S]*?<\/style>/g)].map(m => m[0]).join('\n');
  const out = process.argv[outArg + 1];
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `<title>${title}</title>\n${styles}\n${body.trim()}\n`);
  console.log(`본문 전용 파일 생성: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
} else {
  const out = path.join(root, 'dist/index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`단일 파일 생성: dist/index.html (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}
