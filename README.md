# DIRECTOR’S LAB

[웹 스튜디오 열기](https://aijunny0604-alt.github.io/directors-lab/) · [Windows 로컬 앱 다운로드](https://github.com/aijunny0604-alt/directors-lab/releases/latest)

## 회사·집 PC에서 내 ChatGPT 계정으로 사용

최신 릴리스의 `Directors-Lab-Setup-…-x64.exe`를 각 Windows PC에 설치하세요. 실행 환경이 포함되어 Node.js·Python을 따로 설치하지 않습니다. 각 PC에서 최초 ChatGPT 로그인·플랜 사용 동의를 완료하면 공식 플랜 한도로 실제 제작 역할과 AI 회의실을 실행합니다.

앱은 시작할 때 이 저장소의 최신 스튜디오 원본을 확인하고 호환 검사 통과 후 자동 반영합니다. Google Drive 데스크톱을 두 PC에 설치·로그인하고 앱에서 같은 폴더를 한 번 선택하면 프로젝트·AI 결과·실행 로그·첨부파일을 이어갈 수 있습니다. 로그인 토큰은 각 PC에만 암호화 저장합니다.

- [다른 PC 최초 설정](desktop-app/SETUP.md)
- [Windows 앱 소스·실행·빌드·업데이트](desktop-app/README.md)
- [최신 원본 기반 실제 AI 협업·회의 검증](desktop-app/VERIFICATION.md)
- [GitHub에서 Windows 설치 파일 빌드](https://github.com/aijunny0604-alt/directors-lab/actions/workflows/windows-desktop.yml)

웹페이지 안에서 자동 AI 호출을 쓰는 기존 Firebase/API 경로는 별도 서버·API 사용 조건을 따릅니다. 로컬 앱의 ChatGPT 플랜 연결과는 별개이며, 웹에서 요청을 복사해 ChatGPT로 전달하는 방식도 유지합니다.

## 구현 위치

`index.html`은 계속 발전하는 웹 스튜디오 원본입니다. `desktop-app/`는 Windows 인증·실제 스트림 호출·Drive 폴더 동기화·원본 자동 반영·설치 패키지를 담당합니다. `.github/workflows/windows-desktop.yml`은 검사와 Windows 빌드, GitHub Releases 게시를 수행합니다.

현재 실제 검증은 연결 진단, 제작 실무→감독 검수 및 수정 필요 중단, 10개 부서 1차 발언, 9개 타 부서 발언 참조 검토, 기획팀→촬영팀 지목 질문·답변을 포함합니다. 전체 회의 종결·A/B/C 회의록·집 PC 실동기화의 검증 범위는 위 검증 문서에 명시했습니다.
