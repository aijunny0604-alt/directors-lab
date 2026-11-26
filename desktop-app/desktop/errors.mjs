export class ServiceError extends Error {
  constructor(message, code = 'local_error', status = 0, requestId = '') {
    super(message); this.code = code; this.status = status; this.requestId = requestId;
  }
}
const messages = {
  subscription_sharing_usage_limit_exceeded: 'ChatGPT 플랜 또는 앱의 사용 한도에 도달했습니다. ChatGPT 사용량 설정을 확인하세요.',
  subscription_sharing_user_not_eligible: '이 계정 또는 워크스페이스에서는 ChatGPT 플랜 공유를 사용할 수 없습니다.',
  subscription_sharing_usage_unavailable: 'ChatGPT 사용량을 확인할 수 없습니다. 잠시 후 다시 시도하세요.',
  subscription_sharing_user_unavailable: '계정 정보를 일시적으로 확인할 수 없습니다. 잠시 후 다시 시도하세요.',
  subscription_sharing_unsupported_capability: '선택한 모델 또는 요청 기능이 ChatGPT 플랜 연결에서 지원되지 않습니다.',
  subscription_sharing_route_not_supported: '이 연결에서는 요청 경로가 지원되지 않습니다.',
  subscription_sharing_invalid_user: '계정 인증을 확인할 수 없습니다. 연결 설정에서 다시 로그인하세요.',
  chatpass_v2_scope_not_authorized: 'ChatGPT 플랜 사용 권한이 없습니다. 연결 설정에서 동의를 다시 요청하세요.',
  chatpass_v2_invalid_authorization_context: '계정의 플랜 사용 권한을 확인할 수 없습니다.',
  access_denied: '로그인 또는 플랜 사용 동의가 취소되었습니다.',
  invalid_grant: '인증이 만료되었거나 철회되었습니다. 같은 계정을 선택해 다시 로그인하세요.'
};
export function remoteError(status, body, requestId = '') {
  const raw = body?.error?.code || (typeof body?.error === 'string' ? body.error : '');
  const code = /^[a-zA-Z0-9_.-]{1,100}$/.test(raw) ? raw : `http_${status}`;
  // 서버의 임의 메시지는 토큰이나 사용자 텍스트를 포함할 수 있으므로 UI/로그에 그대로 전달하지 않는다.
  const message = messages[code] || ({401:'인증이 거부되었습니다. 연결 계정과 권한을 확인하세요.',403:'계정·지역 또는 조직 정책에 의해 요청이 거부되었습니다.',429:'요청 또는 사용량 한도에 도달했습니다.',503:'공식 AI 연결을 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도하세요.'}[status]) || '공식 서버 요청이 실패했습니다.';
  return new ServiceError(message, code, status, /^[\w-]{1,180}$/.test(requestId) ? requestId : '');
}
export function publicError(error) {
  if (error instanceof ServiceError) return [error.message, error.status ? `HTTP ${error.status}` : '', error.code, error.requestId ? `요청 ID ${error.requestId}` : ''].filter(Boolean).join(' · ');
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return '요청 시간이 초과되었거나 취소되었습니다. 저장된 작업은 유지됩니다.';
  return '연결 작업을 완료하지 못했습니다. 네트워크와 로그인 상태를 확인하세요.';
}
