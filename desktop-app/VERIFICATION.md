# 실제 AI 작동·협업 검증

검증 일시: 2026. 11. 26. 오후 7:10:42 (Asia/Seoul).

최신 원본 기준: [30c058808d250a448d03c1424bb2a5e664add79b](https://github.com/aijunny0604-alt/directors-lab/commit/30c058808d250a448d03c1424bb2a5e664add79b), DIRECTOR'S LAB 3.2.1 — Cinematic AI Workspace.

모델: gpt-6.2-sol. 사용자 동의를 받은 공식 ChatGPT 플랜 연결로 합성 보드만 전송했다. API 키·로그인 토큰·개인 프로젝트는 이 문서와 GitHub에 포함하지 않았다.

## 실제 실행 결과

- 연결 진단: 실제 응답 DIRECTOR_LAB_OK 확인, 응답 ID resp_04fd5e1bf95fea5b016b0801640a6887d0968948a685fae4ae.
- 제작: 기획 실무 → 기획 감독의 서로 다른 실제 요청 2회와 선행 초안 전달·저장 확인. 기획 감독이 수정 필요를 판정하자 후속 제작이 중단되어 원본 검수 게이트가 작동했다.
- 회의: 기획·작가·캐릭터·아트·촬영·조명·편집·사운드·AI 영상·광고 10개 부서의 1차 실제 응답을 각각 저장했다.
- 상호 검토: 첫 부서의 2차 응답이 타 부서 9명의 실제 발언 ID를 모두 정확히 참조했다.
- 지목 대화: development → camera 질문을 실제 발신 발언 ID c5514298-26e2-4aac-9872-a361474e539b와 연결하여 전달하고 611자의 직접 답변을 저장했다.
- 회의실 실호출 12회 모두 response.completed 이후 저장되었으며 서로 다른 응답 ID와 모델·사용량을 기록했다.

## 회의 호출 증빙

| 작업 | 모델 | 실제 응답 ID | 총 토큰 |
|---|---|---|---:|
| initial:development | gpt-6.2-sol | resp_044819d040ac79d3016b08049325f487d08c65346a00cd30c9 | 3432 |
| initial:writing | gpt-6.2-sol | resp_0282b02fdfa1ef1a016b0804a64c4887d0808f915b49f61431 | 4602 |
| initial:cast | gpt-6.2-sol | resp_00d7eca90b6245f7016b0804c30f0487d087ee9d9cf807d644 | 5230 |
| initial:art | gpt-6.2-sol | resp_006a42c6430f4e08016b0804d790a087d0aa094d944b452a38 | 5852 |
| initial:camera | gpt-6.2-sol | resp_0f2a57e620fcd9c3016b0804ebc73887d0a3cfd4405332087b | 6907 |
| initial:light | gpt-6.2-sol | resp_073f187aef3e6b9b016b0805087c2887d0971a9c346f2f17e3 | 7063 |
| initial:post | gpt-6.2-sol | resp_030dc6e1c80fe952016b08051d832887d0997db1365ce39510 | 8027 |
| initial:sound | gpt-6.2-sol | resp_0cb587fe1fdc136f016b0805373edc87d0b1fe3c28daac1de9 | 8267 |
| initial:ai | gpt-6.2-sol | resp_07fcd636e556bd05016b080549eba087d0a9e2890d927a3653 | 9054 |
| initial:ad | gpt-6.2-sol | resp_0828b450174e018f016b08055c189887d099c1d9b8ac06bff8 | 9280 |
| revision:development | gpt-6.2-sol | resp_0d1c7032255ebe8a016b08056bda7c87d0bedffdeb61709357 | 11537 |
| reply-10feceed-6d62-416b-a85d-3c5c95aa98ac | gpt-6.2-sol | resp_09d2411a738898bd016b080591a0f487d0a4693d4fcdfb1e58 | 11877 |

## 실환경에서 재현하고 수정한 문제

1. Content-Type 헤더가 없는 정상 SSE를 거부하던 Windows 스트림 검사를 수정했다. 실제 데이터 이벤트 및 response.completed 검증은 유지하며 중단·실패 응답을 성공으로 처리하지 않는다.
2. 회의 모델의 statement가 1,500자 검증 상한을 초과하여 저장이 중단되는 문제를 재현했다. 원본 prompt39에 statement·reply·reviews·회의록 각 문자열의 보수적인 생성 길이를 명시했다. 검증 한도를 낮추거나 결과를 잘라 성공 처리하지 않았다.

## 범위와 한계

- 합성 보드를 이용한 제작 실무→감독 검수와 수정 필요 중단, 전 부서 1차 의견 및 첫 부서의 2차 전 부서 의견 검토, 지목 답변 점검. 전체 회의 종결·A/B/C 회의록·인간 승인·집 PC 실동기화는 별도 검증 대상.
- 회의 점검은 원본 큐에서 생성된 지목 답변을 우선 실행했다. 다른 부서의 2차 의견과 최종 중재는 이 실행에서 미검증.
- 동일 계정의 선택한 모델을 역할별로 별도 호출하는 구조이다. 각 호출은 자기 역할과 전달받은 선행 발언만 처리한다.
- 자동화 회귀 검사 25개와 Electron 실행·화면·패키징 검사를 통과했다. 자동 원본 업데이트의 고정 커밋 다운로드·오프라인 복구·손상 캐시 거부도 검사했다.
- Google Drive 데스크톱 앱이 현재 PC에 미설치 상태이므로 실제 회사↔집 Drive 전달은 아직 연결·검증하지 않았다. 폴더 동기화 엔진의 양방향 전송·충돌 보존·첨부파일 해시 검사는 별도 자동 테스트로 통과했다.
