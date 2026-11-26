DIRECTOR'S LAB · Windows 개인 스튜디오

1. 회사 PC와 집 PC에서 사용
   최신 다운로드: https://github.com/aijunny0604-alt/directors-lab/releases/latest
   Directors-Lab-Setup 실행 파일로 각 PC에 설치하세요.
   설치가 필요 없는 ZIP은 각 PC의 로컬 폴더에 풀고 Directors Lab.exe를 실행하세요.
   ZIP에서 실행 파일만 따로 꺼내면 실행할 수 없습니다.
   실행 환경이 포함되어 Node.js나 Python을 별도로 설치하지 않습니다.
   시작할 때 GitHub의 최신 호환 스튜디오 원본을 자동 반영합니다.
   Windows 인증·동기화 연결 프로그램 자체의 새 버전은 최신 설치 파일로 갱신하세요.

2. 내 ChatGPT 계정 연결
   앱 왼쪽 'ChatGPT 연결' → Continue with ChatGPT.
   공식 auth.openai.com 브라우저 창에서 로그인하고 플랜 사용에 동의하세요.
   앱으로 돌아와 모델 선택 → '연결 테스트 (AI 1회)'를 실행하세요.
   계정의 권한·지역·플랜 한도에 따라 연결이 거부될 수 있습니다.
   실제 로그인과 AI 응답 성공은 이 테스트로 확인해야 합니다.
   별도 OpenAI API 키를 입력하지 않습니다. 다른 유료 API로 자동 전환하지 않습니다.

3. Google Drive로 자동 이어하기
   두 PC에 Google Drive 데스크톱 앱을 설치하고 같은 Google 계정으로 연결하세요.
   앱의 '기기 동기화' → 'Google Drive 폴더 선택'.
   Drive 안의 개인 폴더를 선택하면 DirectorsLab-sync가 생성됩니다.
   집 PC에서도 Drive의 같은 폴더 또는 DirectorsLab-sync 폴더를 선택하세요.
   프로젝트·AI 결과·첨부파일을 약 15초마다 확인합니다.
   다른 PC까지 전달되는 시간은 Google Drive 업로드·다운로드 상태에 따라 달라집니다.
   동기화 폴더는 '오프라인 사용 가능'으로 설정하는 것을 권장합니다.
   두 PC 동시 수정은 자동 덮어쓰기 대신 버전 선택으로 처리합니다.
   이력은 Google Drive의 revisions와 blobs에 보존합니다. 임의로 일부 파일을 삭제하지 마세요.
   사용 후 '지금 동기화'와 Google Drive 업로드 완료를 확인하고 다른 PC로 이동하세요.

4. 기존 웹사이트 자료 가져오기
   기존 웹사이트 → 백업 → JSON 백업 내려받기.
   Windows 앱 → 백업 → JSON 파일 복원.
   기존 에셋 파일은 웹사이트의 에셋 관리실에서 따로 백업한 뒤 앱으로 가져오세요.
   웹 브라우저와 Windows 앱의 로컬 자료는 처음에는 별개입니다.
   웹사이트에서 이후 수정한 자료가 앱으로 자동 반영되지는 않습니다.

5. 보관 범위
   ChatGPT 로그인·토큰: 각 PC의 Windows 계정에 묶어 암호화 보관.
   프로젝트: 각 PC 로컬 및 사용자가 선택한 Google Drive 폴더.
   가져오기 전 프로젝트 자동 백업: '기기 동기화'의 '적용 전 자동 백업 폴더'.
   자동 백업 JSON에는 storage와 files가 있습니다. 복구 시 임의로 원본을 덮어쓰지 말고 보관하세요.
   로그인 폴더는 다른 PC로 복사하지 마세요. 각 PC에서 따로 로그인하세요.
   Google Drive에 선택한 폴더의 공유 권한은 사용자가 관리합니다.
   현재 첨부파일 동기화 한도: 전체 80MB. 큰 원본 영상은 별도 보관하세요.
   AI 요청에는 보드와 선행 결과의 텍스트가 전송됩니다. 원본 영상 자동 분석은 포함하지 않습니다.

6. 연결 실패
   기본 브라우저에서 auth.openai.com 로그인을 완료하세요.
   플랜 권한이 없으면 '플랜 동의 다시 요청'을 사용하세요.
   사용량 초과 시 ChatGPT 설정 → 사용량에서 앱 한도를 확인하세요.
   임시 네트워크 오류로 계정이나 프로젝트를 지우지 마세요.
   원격 연결 해제가 확인되지 않았다는 안내가 나오면 ChatGPT 설정에서 이 앱을 해제하세요.
   동기화 실패 시 Drive 실행·로그인·다운로드 완료와 폴더 접근 권한을 확인하세요.

7. 개발 소스
   Node.js와 npm이 있는 Windows에서 npm ci → npm test → npm run dist.
   npm start로 개발 실행. 인증 또는 실사용 AI 테스트에는 사용자 로그인이 필요합니다.
   본 배포물은 개인용 서명 없는 빌드입니다. 기관 PC의 실행 정책에 따라 설치가 차단될 수 있습니다.
   실행 정책을 임의로 우회하지 말고 기관 관리자에게 허용 여부를 확인하세요.

공식 문서
https://developers.openai.com/siwc/token-sharing-open-source
https://developers.openai.com/siwc/token-sharing-open-source/sign-in
https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference

