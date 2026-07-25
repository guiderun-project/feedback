# 익명 의견 제출 서비스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 훈련 프로그램 참가자가 익명으로 의견을 남기는 단일 페이지(`feedback.guiderun.org`)와, 그 의견을 Google Sheet에 기록하는 Google Apps Script 백엔드를 만든다. 관리자 페이지는 없다.

**Architecture:** 순수 정적 HTML/CSS/JS 프론트엔드(Netlify 호스팅)가 `fetch(POST)`로 Google Apps Script 웹앱을 호출하고, Apps Script가 연결된 Google Sheet에 `[날짜, 내용]` 행을 추가한다. 운영자는 관리자 UI 없이 시트를 직접 열람한다.

**Tech Stack:** 순수 HTML/CSS/JavaScript (프레임워크 없음), Google Apps Script, Google Sheets, Netlify. 테스트는 Node.js 내장 `assert` 모듈만 사용 (npm 의존성 없음).

## Global Constraints

- 관리자 페이지를 만들지 않는다. 운영자는 Google Sheet를 직접 열람한다.
- 참가자 식별 정보(이름/이메일/로그인 등)를 입력받거나 수집하지 않는다.
- Google Sheet는 정확히 2개 컬럼만 사용한다: A=제출 일시, B=의견 내용.
- 프레임워크·빌드 도구 없이 순수 HTML/CSS/JS로 구현한다.
- 검색엔진 노출을 차단한다: `<meta name="robots" content="noindex, nofollow">` + `robots.txt`의 `Disallow: /`.
- Honeypot 필드로 기본적인 봇 스팸을 방지한다.
- 원본 Google Sheet는 비공개 공유를 유지하고, Apps Script 웹앱 엔드포인트만 공개한다.
- 프론트엔드에서 Apps Script로 보내는 요청은 `Content-Type: text/plain`으로 전송해 CORS preflight를 회피한다.
- 상단에 그룹명 "가이드런 프로젝트"를 표시하고, favicon/아이콘은 `https://guiderun.org/service_logo_black.png`를 그대로 사용한다.
- 포인트 컬러 기본값은 `#2563EB`.
- Netlify에 배포하고 커스텀 도메인 `feedback.guiderun.org`를 연결한다.

---

### Task 1: Google Apps Script 백엔드 (`handleSubmission` + `doPost`)

**Files:**
- Create: `apps-script/Code.js`
- Test: `apps-script/Code.test.js`

**Interfaces:**
- Produces: `handleSubmission(payload)` — 순수 함수. `payload: { feedback?: string, website?: string }` → `{ action: 'append', row: [Date, string] }` | `{ action: 'ignore' }` | `{ action: 'error', message: string }`. `website`는 honeypot 필드(채워져 있으면 무시).
- Produces (계약, Task 3에서 소비): Apps Script 웹앱은 POST 본문으로 JSON `{ feedback: string, website: string }`을 받고, 응답으로 JSON `{ status: 'ok' | 'error' }`를 반환한다. Honeypot에 걸려 무시된 제출도 정상 제출과 동일하게 `'ok'`를 반환한다 — 스팸 탐지 여부를 응답으로 구분해서 노출하지 않기 위한 의도적 설계.
- `doPost(e)`는 `SpreadsheetApp`을 사용하므로 Node에서 테스트하지 않는다. 시트 탭 이름은 `"Feedback"`으로 고정(`getSheetByName('Feedback')`).

- [ ] **Step 1: 실패하는 테스트 작성**

`apps-script/Code.test.js`:
```js
const assert = require('assert');
const { handleSubmission } = require('./Code.js');

function testAppendsValidFeedback() {
  const result = handleSubmission({ feedback: '  강의가 유익했어요  ', website: '' });
  assert.strictEqual(result.action, 'append');
  assert.strictEqual(result.row[1], '강의가 유익했어요');
  assert.ok(result.row[0] instanceof Date);
}

function testIgnoresHoneypotFill() {
  const result = handleSubmission({ feedback: 'buy now', website: 'http://spam.example' });
  assert.strictEqual(result.action, 'ignore');
}

function testRejectsEmptyFeedback() {
  const result = handleSubmission({ feedback: '   ', website: '' });
  assert.strictEqual(result.action, 'error');
}

function testRejectsMissingFeedback() {
  const result = handleSubmission({ website: '' });
  assert.strictEqual(result.action, 'error');
}

testAppendsValidFeedback();
testIgnoresHoneypotFill();
testRejectsEmptyFeedback();
testRejectsMissingFeedback();
console.log('Code.test.js: all tests passed');
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node apps-script/Code.test.js`
Expected: `Cannot find module './Code.js'` 에러로 FAIL

- [ ] **Step 3: 최소 구현 작성**

`apps-script/Code.js`:
```js
function handleSubmission(payload) {
  var feedback = payload && typeof payload.feedback === 'string' ? payload.feedback.trim() : '';
  var honeypot = payload && typeof payload.website === 'string' ? payload.website.trim() : '';

  if (honeypot !== '') {
    return { action: 'ignore' };
  }
  if (feedback === '') {
    return { action: 'error', message: 'empty feedback' };
  }
  return { action: 'append', row: [new Date(), feedback] };
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var decision = handleSubmission(payload);

  if (decision.action === 'append') {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Feedback');
    sheet.appendRow(decision.row);
  }

  var status = decision.action === 'error' ? 'error' : 'ok';
  return ContentService
    .createTextOutput(JSON.stringify({ status: status }))
    .setMimeType(ContentService.MimeType.JSON);
}

if (typeof module !== 'undefined') {
  module.exports = { handleSubmission };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node apps-script/Code.test.js`
Expected: `Code.test.js: all tests passed` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add apps-script/Code.js apps-script/Code.test.js
git commit -m "feat: add Apps Script feedback handler with tests"
```

---

### Task 2: 프론트엔드 마크업 & 스타일

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `service_logo_black.png` (guiderun.org에서 다운로드)

**Interfaces:**
- Produces (Task 3가 소비할 DOM 계약): `#feedback-form`(form), `#feedback`(textarea, name="feedback"), `#website`(honeypot input, name="website"), `#submit-button`(button), `#result-message`(p, `hidden` 속성으로 시작).

- [ ] **Step 1: 실제 favicon 파일 다운로드**

```bash
curl -s -L -o service_logo_black.png https://guiderun.org/service_logo_black.png
```

Expected: `service_logo_black.png` 파일 생성 (PNG, 280x280)

- [ ] **Step 2: `index.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>가이드런 프로젝트 - 의견함</title>
  <link rel="icon" href="/service_logo_black.png">
  <link rel="apple-touch-icon" href="/service_logo_black.png">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="card">
    <header class="brand">
      <img src="/service_logo_black.png" alt="" class="brand-icon">
      <span class="brand-name">가이드런 프로젝트</span>
    </header>

    <h1>훈련 프로그램 의견함</h1>
    <p class="guide">
      자유롭게 의견을 남겨주세요.<br>
      익명으로 제출되며, 어떤 개인정보도 수집하지 않습니다.
    </p>

    <form id="feedback-form">
      <textarea
        id="feedback"
        name="feedback"
        rows="6"
        placeholder="의견을 입력해주세요"
        required
      ></textarea>

      <div class="visually-hidden">
        <label for="website">웹사이트</label>
        <input type="text" id="website" name="website" tabindex="-1" autocomplete="off">
      </div>

      <button type="submit" id="submit-button">제출하기</button>
    </form>

    <p id="result-message" class="result-message" hidden></p>
  </main>

  <script src="/app.js" defer></script>
</body>
</html>
```

- [ ] **Step 3: `styles.css` 작성**

```css
:root {
  --accent: #2563eb;
  --bg: #f8fafc;
  --text: #1f2933;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 24px;
}

.card {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 12px;
  padding: 32px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.brand-icon {
  width: 20px;
  height: 20px;
}

.brand-name {
  font-size: 14px;
  color: #64748b;
}

h1 {
  font-size: 20px;
  margin: 0 0 12px;
}

.guide {
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 20px;
}

textarea {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
}

button {
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-message {
  margin-top: 16px;
  font-size: 14px;
  text-align: center;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
```

- [ ] **Step 4: 구조 검증**

Run:
```bash
grep -c 'name="robots" content="noindex, nofollow"' index.html
grep -c 'name="website"' index.html
grep -c '가이드런 프로젝트' index.html
```
Expected: 각 명령이 `1` 이상 출력. 이어서 브라우저(또는 `python3 -m http.server`)로 `index.html`을 열어 모바일 폭(375px)에서 레이아웃이 깨지지 않는지 눈으로 확인.

- [ ] **Step 5: 커밋**

```bash
git add index.html styles.css service_logo_black.png
git commit -m "feat: add feedback page markup and styles"
```

---

### Task 3: 프론트엔드 제출 로직 (`app.js`)

**Files:**
- Create: `app.js`
- Test: `app.test.js`

**Interfaces:**
- Consumes: Task 2의 DOM 요소 id들(`feedback-form`, `feedback`, `website`, `submit-button`, `result-message`), Task 1의 응답 계약(`{ status: 'ok' | 'error' }`). Honeypot에 걸려 무시된 제출도 `'ok'`로 응답하므로, 프론트엔드는 이를 정상 제출과 동일하게 처리한다(구분 로직 불필요).
- Produces: `isValidFeedback(text)` — 순수 함수, `string` → `boolean` (trim 후 길이 0 초과면 true).

- [ ] **Step 1: 실패하는 테스트 작성**

`app.test.js`:
```js
const assert = require('assert');
const { isValidFeedback } = require('./app.js');

assert.strictEqual(isValidFeedback('좋은 프로그램이었어요'), true);
assert.strictEqual(isValidFeedback('   '), false);
assert.strictEqual(isValidFeedback(''), false);
console.log('app.test.js: all tests passed');
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node app.test.js`
Expected: `Cannot find module './app.js'` 에러로 FAIL

- [ ] **Step 3: 최소 구현 작성**

`app.js`:
```js
var ENDPOINT_URL = 'REPLACE_WITH_APPS_SCRIPT_WEB_APP_URL';

function isValidFeedback(text) {
  return typeof text === 'string' && text.trim().length > 0;
}

function initFeedbackForm() {
  var form = document.getElementById('feedback-form');
  var feedbackField = document.getElementById('feedback');
  var honeypotField = document.getElementById('website');
  var submitButton = document.getElementById('submit-button');
  var resultMessage = document.getElementById('result-message');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var text = feedbackField.value;
    if (!isValidFeedback(text)) {
      return;
    }

    submitButton.disabled = true;
    resultMessage.hidden = true;

    fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        feedback: text,
        website: honeypotField.value
      })
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.status === 'error') {
          throw new Error('server rejected submission');
        }
        feedbackField.value = '';
        resultMessage.textContent = '의견이 제출되었습니다. 감사합니다 🙏';
        resultMessage.hidden = false;
      })
      .catch(function () {
        resultMessage.textContent = '제출에 실패했습니다. 다시 시도해주세요.';
        resultMessage.hidden = false;
      })
      .finally(function () {
        submitButton.disabled = false;
      });
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initFeedbackForm);
}

if (typeof module !== 'undefined') {
  module.exports = { isValidFeedback };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node app.test.js`
Expected: `app.test.js: all tests passed` 출력, exit code 0

- [ ] **Step 5: 커밋**

```bash
git add app.js app.test.js
git commit -m "feat: add feedback form submit logic with tests"
```

---

### Task 4: `robots.txt` & Netlify 배포 설정

**Files:**
- Create: `robots.txt`
- Create: `netlify.toml`

**Interfaces:**
- 없음 (배포 설정 전용, 다른 태스크의 코드를 참조하지 않음).

- [ ] **Step 1: `robots.txt` 작성**

```
User-agent: *
Disallow: /
```

- [ ] **Step 2: `netlify.toml` 작성**

```toml
[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow"
```

- [ ] **Step 3: 검증**

Run: `cat robots.txt netlify.toml`
Expected: `Disallow: /`와 `publish = "."`가 그대로 출력되는지 확인

- [ ] **Step 4: 커밋**

```bash
git add robots.txt netlify.toml
git commit -m "chore: add robots.txt and netlify deploy config"
```

---

### Task 5: 배포 및 수동 설정 (운영자 런북)

**Files:** 없음 (Google/Netlify/DNS 콘솔에서 수행하는 수동 작업). 이 태스크는 Google/Netlify 계정 소유자만 수행할 수 있으므로 에이전트가 자동으로 완료할 수 없다 — 사람이 직접 진행해야 한다.

**Interfaces:**
- Consumes: Task 1의 `apps-script/Code.js` 전체 내용, Task 3의 `app.js` 내 `ENDPOINT_URL` 자리표시자.

- [ ] **Step 1: Google Sheet 준비**

새 Google Sheet를 만들고, 탭(시트) 이름을 정확히 `Feedback`으로 지정한다 (`Code.js`의 `getSheetByName('Feedback')`과 일치해야 함).

- [ ] **Step 2: Apps Script 배포**

시트에서 `확장 프로그램 → Apps Script` 열기 → 기본 `Code.gs` 내용을 지우고 `apps-script/Code.js`의 전체 내용을 붙여넣기 → 저장 → `배포 → 새 배포 → 유형: 웹 앱` → 실행: 나, 액세스 권한: 모든 사용자 → 배포 → Google 권한 승인 팝업에서 승인 → 발급된 웹 앱 URL 복사.

- [ ] **Step 3: 프론트엔드에 실제 엔드포인트 반영**

`app.js`의 `ENDPOINT_URL` 값을 Step 2에서 복사한 실제 URL로 교체.

```bash
git add app.js
git commit -m "chore: point frontend at deployed Apps Script endpoint"
```

- [ ] **Step 4: Netlify 배포**

Netlify에서 이 리포지토리를 새 사이트로 연결(또는 기존 계정의 CLI/드래그 배포 사용) → 빌드 명령 없음, publish directory `.` 확인 → 배포 후 기본 `*.netlify.app` URL로 정상 동작 확인.

- [ ] **Step 5: 커스텀 도메인 연결**

Netlify 사이트 설정 → Domain management → `feedback.guiderun.org` 추가 → Netlify가 안내하는 CNAME 대상 값 확인 → `guiderun.org` DNS 관리 콘솔에서 `feedback` 서브도메인에 해당 CNAME 레코드 추가 → DNS 전파 후 `https://feedback.guiderun.org` 접속 확인.

- [ ] **Step 6: Google Sheet 비공개 유지 확인**

원본 스프레드시트의 공유 설정이 "링크가 있는 모든 사용자"가 아니라 특정 사용자(운영자)로만 제한되어 있는지 확인.

- [ ] **Step 7: 수동 QA 체크리스트**

- [ ] 정상 텍스트 제출 → Google Sheet `Feedback` 탭에 `[날짜, 내용]` 행이 정확히 추가되는지 확인
- [ ] textarea를 비워둔 채 제출 → 클라이언트에서 제출이 막히는지 확인 (`required` 속성)
- [ ] 브라우저 devtools로 honeypot(`#website`) 필드에 값을 채운 뒤 제출 → 시트에 행이 추가되지 않는지 확인
- [ ] 모바일 폭 화면에서 레이아웃 확인
- [ ] 페이지 소스에서 `<meta name="robots" content="noindex, nofollow">` 렌더링 확인
- [ ] 배포 1~2주 후 `site:feedback.guiderun.org`로 검색해 색인 여부 확인

---

## Self-Review 결과

- **스펙 커버리지:** 목적/비범위/아키텍처/데이터모델/프론트엔드/백엔드/배포·도메인/수동설정/에러처리/테스트 — 스펙의 모든 섹션이 Task 1~5에 매핑됨.
- **Placeholder 스캔:** `ENDPOINT_URL`의 `REPLACE_WITH_APPS_SCRIPT_WEB_APP_URL`은 배포 전에는 실제 URL을 알 수 없어 의도적으로 남긴 자리표시자이며, Task 5 Step 3에서 실제 값으로 교체하는 절차가 명시되어 있어 방치되지 않음.
- **타입/시그니처 일관성:** `handleSubmission`의 반환 형태(`action`/`row`/`message`)와 `doPost`, `app.js`의 응답 처리(`status`)가 Task 1~3에서 서로 일치함을 확인.
