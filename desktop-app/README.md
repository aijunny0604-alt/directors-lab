# DIRECTOR’S LAB · Windows 로컬 앱

회사 PC와 집 PC에서 각각 실행하고 같은 ChatGPT 계정으로 로그인하는 개인 스튜디오입니다. 별도 API 키 없이 공식 Sign in with ChatGPT의 플랜 사용 권한을 요청합니다. 계정·지역·조직 정책과 ChatGPT 사용 한도가 적용됩니다.

## 다른 PC에서 실행

1. 이 저장소 전체를 ZIP으로 내려받아 압축을 풀거나 `git clone`합니다.
2. Windows용 Node.js LTS를 설치합니다.
3. `desktop-app` 폴더에서 아래 명령을 실행합니다.

```powershell
npm ci
npm start
```

앱의 **ChatGPT 연결 → Continue with ChatGPT**에서 로그인하고 플랜 사용에 동의한 뒤 모델을 선택하세요. **연결 테스트 (AI 1회)**로 실제 응답을 확인할 수 있습니다. 로그인·동의는 각 PC에서 별도로 진행합니다.

`npm start`와 빌드는 저장소 루트의 최신 `index.html`을 읽어 Windows 앱에 반영합니다. 루트 웹사이트 원본은 수정하지 않습니다. 업데이트는 저장소를 다시 내려받거나 `git pull`한 뒤 실행하세요.

## 설치 파일 만들기

```powershell
npm test
npm run dist
```

`dist`에 Windows x64 설치 파일과 압축형 실행 폴더 ZIP이 생성됩니다. ZIP은 전체를 풀고 `Directors Lab.exe`를 실행하세요. 생성물에는 개인 로그인 정보가 포함되지 않습니다.

GitHub **Actions → Windows 로컬 앱 빌드 → Run workflow**로도 설치 파일을 만들 수 있습니다. 완료된 실행의 **Artifacts → Directors-Lab-Windows**를 내려받으세요. GitHub Actions의 사용 가능량·저장 정책은 GitHub 계정 조건에 따릅니다.

## Google Drive로 회사·집 작업 이어가기

두 PC의 Google Drive 데스크톱 앱을 같은 Google 계정으로 연결하세요. 앱의 **기기 동기화 → Google Drive 폴더 선택**에서 같은 Drive 폴더를 고릅니다. `DirectorsLab-sync` 하위 폴더를 자동으로 사용합니다.

- 보드·프로젝트·AI 결과·실행 로그·첨부파일을 주기적으로 확인합니다.
- 실제 다른 PC 도착은 Google Drive 업로드·다운로드 완료에 따라 달라집니다.
- 동시에 수정한 버전은 보존하고 사용할 버전을 선택하게 합니다.
- ChatGPT 토큰은 Windows 계정으로 암호화하며 Drive·GitHub에는 올리지 않습니다.
- 폴더는 오프라인 사용 가능으로 설정하고 PC 이동 전 Drive 업로드 완료를 확인하세요.
- 전체 첨부파일 한도는 80MB입니다. 큰 영상 원본은 별도로 보관하세요.

기존 웹사이트 기록은 웹사이트의 JSON 백업을 앱에서 복원하세요. 원본 에셋은 에셋 관리실의 백업·가져오기를 함께 사용합니다. 웹사이트와 Windows 앱의 로컬 저장소는 별개입니다.

## AI 에이전트·회의실 검증

각 팀은 같은 계정의 선택한 모델에 서로 다른 역할·이전 산출물을 전달하는 **별도 실제 요청**으로 실행됩니다. 서로 다른 모델을 자동 배정하거나 모델 자체를 재학습하는 구조는 아닙니다.

- **ChatGPT 연결 → 실제 AI 협업 점검**: 별도 합성 프로젝트에서 최대 4단계 실제 제작 호출·선행 결과 전달·검수·저장을 확인하고 보고서를 만듭니다.
- **AI 회의실**: 전 부서 독립 의견 → 타 부서 발언 ID를 참조하는 재검토 → 지목 질문·반론·답변 → 총괄 중재·A/B/C 회의록을 실행합니다.
- **AI 협업 관제 대시보드**: 요청·응답·저장 로그와 실제 산출물 증빙을 확인합니다.
- 응답 ID·모델·사용량은 실제 서버가 제공한 값만 기록합니다. 완료 전 중단·검수 실패·사용량 초과는 성공으로 집계하지 않습니다.

`npm test`는 실제 모델 대신 네트워크·인증·스트림·동시 수정의 경계 조건을 검사합니다. 실제 AI 작동 성공은 로그인 후 별도로 확인해야 합니다. 회의 전체 실행은 부서 수와 추가 토론에 따라 여러 요청과 사용량을 소비합니다.

## 구현과 데이터

`desktop/`는 인증·스트림·동기화·Electron 경계를, `desktop-ui.js`는 원본 기능에 추가하는 연결·동기화 화면을 담당합니다. `index.html`·`studio.js`는 루트 원본에서 생성하며 Git에 중복 저장하지 않습니다.

이 앱은 개인용 서명 없는 Windows 빌드입니다. 상세 사용법은 `README-KO.txt`를 참고하세요. Google Drive 공유 권한과 조직 PC의 실행 허용 여부는 해당 서비스·기관 설정을 따릅니다.

공식 문서: [로컬 앱 플랜 연결](https://developers.openai.com/siwc/token-sharing-open-source), [인증](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [모델 및 실제 요청](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference).
