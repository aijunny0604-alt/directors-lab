import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ServiceError } from './errors.mjs';

export async function atomicWrite(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, value, { mode: 0o600, flag: 'wx' });
  await rename(temporary, path);
}
export class Vault {
  constructor(directory, crypto) { this.directory = directory; this.crypto = crypto; this.data = null; }
  async load() {
    await mkdir(this.directory, { recursive: true });
    const hostPath = join(this.directory, 'host.json');
    try {
      this.host = JSON.parse(await readFile(hostPath, 'utf8')).id;
      if (!/^urn:uuid:[0-9a-f-]{36}$/.test(this.host)) throw Error('invalid');
    } catch (e) {
      if (e.code !== 'ENOENT') throw new ServiceError('이 PC의 연결 식별자 파일을 읽을 수 없습니다.', 'host_file_error');
      this.host = `urn:uuid:${randomUUID()}`;
      await atomicWrite(hostPath, JSON.stringify({ id: this.host }));
    }
    try {
      const encrypted = await readFile(join(this.directory, 'credentials.bin'));
      this.data = JSON.parse(await this.crypto.decrypt(encrypted));
      if (this.data.version !== 1 || !Array.isArray(this.data.profiles)) throw Error('invalid');
    } catch (e) {
      if (e.code !== 'ENOENT') throw new ServiceError('이 PC의 암호화된 로그인 정보를 열 수 없습니다. 다른 PC의 인증 폴더를 복사하지 말고 각 PC에서 로그인하세요.', 'vault_decryption_error');
      this.data = { version: 1, active: '', profiles: [] };
    }
    return this;
  }
  async save() {
    const encrypted = await this.crypto.encrypt(JSON.stringify(this.data));
    await atomicWrite(join(this.directory, 'credentials.bin'), encrypted);
  }
  active() { return this.data.profiles.find(p => p.id === this.data.active); }
  status() {
    const active = this.active();
    return { active: active?.id || '', sharing: !!active?.access_token && active.scopes.includes('chatgpt.tokens.use.direct'), profiles: this.data.profiles.map(p => ({id:p.id,email:p.email,connected:!!p.access_token,sharing:!!p.access_token && p.scopes.includes('chatgpt.tokens.use.direct')})) };
  }
}
