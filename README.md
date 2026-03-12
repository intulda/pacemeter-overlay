# paceMeter Overlay

paceMeter 오버레이 프론트엔드 애플리케이션입니다.

이 앱은 HUD를 렌더링하고, 백엔드 오버레이 WebSocket에 연결하며, 필요하면 로컬 ACT OverlayPlugin WebSocket을 읽어서 중앙 백엔드 서버로 relay 합니다.

## 요구사항

- macOS 데스크톱 환경
- `LIVE` 모드 사용 시 ACT + OverlayPlugin
- paceMeter 백엔드 서버

## 동작 모드

오버레이는 두 가지 입력 모드를 지원합니다.

### `LIVE`

- 로컬 ACT OverlayPlugin `ws://127.0.0.1:10501/ws`에 연결
- ACT 이벤트를 설정된 백엔드 서버로 relay
- 백엔드 오버레이 WebSocket에 `sessionId`와 함께 연결
- 각 테스터가 자기 ACT로 실전 테스트할 때 사용

### `REPLAY`

- 로컬 ACT에 연결하지 않음
- `sessionId` 없이 백엔드 글로벌 오버레이 WebSocket에 연결
- 백엔드 `/api/replay/start` 기반 리플레이 테스트에 사용

## 상단 제어 UI

HUD 상단에서 다음 기능을 사용할 수 있습니다.

- `LIVE` / `REPLAY` 모드 전환
- 백엔드 서버 URL 변경
- `LIVE` 모드의 relay 세션 ID 확인 및 재발급
- `DEBUG` 패널 토글
- `LOCK` / `MOVE` 전환

단축키:

- `Ctrl+Shift+O`: 이동 잠금 전환
- `Ctrl+Shift+D`: 디버그 패널 전환

## 사용하는 백엔드 경로

- 오버레이 WebSocket: `/overlay/ws`
- 디버그 API: `/api/debug/combat`
- ACT relay ingest: `/api/relay/{sessionId}/events`
- 리플레이 시작: `/api/replay/start`

## 로컬 개발

의존성 설치:

```bash
npm install
```

프론트 개발 서버 실행:

```bash
npm run dev
```

Electron 앱 빌드:

```bash
npm run build
```

## 테스트 흐름

### 중앙 백엔드 기준 실전 테스트

1. 외부에서 접근 가능한 paceMeter 백엔드 서버를 실행합니다.
2. 오버레이 앱을 실행합니다.
3. 모드를 `LIVE`로 둡니다.
4. 상단 버튼으로 백엔드 URL을 입력합니다.
5. 로컬 PC에서 ACT OverlayPlugin을 실행합니다.
6. 상단 상태가 `ACT LIVE`로 바뀌는지 확인합니다.

### 리플레이 테스트

1. paceMeter 백엔드를 실행합니다.
2. 오버레이 앱을 실행합니다.
3. 모드를 `REPLAY`로 바꿉니다.
4. 백엔드에서 리플레이를 시작합니다.

```bash
curl -X POST "http://localhost:8080/api/replay/start?fileName=heavy3_pull1_minimal.log&delayMs=10"
```

5. HUD가 리플레이 스냅샷으로 갱신되는지 확인합니다.

## 패키징

`electron-builder`를 사용해 macOS DMG를 생성합니다.

현재 출력 경로:

```text
release/0.0.0/YourAppName-Mac-0.0.0-Installer.dmg
```

현재 남아 있는 패키징 과제:

- 앱 이름 placeholder 교체
- 아이콘 확정
- 코드 서명 미설정

## 참고 사항

- 창 높이는 HUD 높이에 맞춰 자동 조절됩니다.
- 최소 창 너비는 `375px`입니다.
- 파티 리스트를 숨기면 아래 클릭을 막지 않아야 합니다.
- `LIVE` 모드에서는 각 클라이언트가 고유 `sessionId`를 사용합니다.
