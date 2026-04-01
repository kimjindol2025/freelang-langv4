# gogs-cli-fl 설치 및 구성 가이드

## 요구사항

- **Node.js** 16.0.0 이상
- **FreeLang** v4.2.0 이상
- **Gogs** 서버 (0.9 이상)
- **Unix-like 시스템** (Linux, macOS, WSL)

## 빠른 설치

### 1단계: 저장소 클론

```bash
git clone https://gogs.dclub.kr/kim/freelang-v4.git
cd freelang-v4
```

### 2단계: 의존성 설치

```bash
npm install
```

### 3단계: 로그인 설정

```bash
fl src/commands/main.fl auth login \
  --host https://gogs.dclub.kr \
  --token YOUR_GITHUB_TOKEN
```

### 4단계: 설정 확인

```bash
fl src/commands/main.fl auth status
```

정상 작동하면 다음과 같은 메시지가 출력됩니다:

```
✓ Logged in as: your_username
✓ Host: https://gogs.dclub.kr
✓ Token: (set)
```

## 상세 설치 가이드

### 시스템별 설치

#### Linux (Ubuntu/Debian)

```bash
# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# FreeLang 설치
npm install -g freelang

# 버전 확인
freelang --version
```

#### macOS

```bash
# Homebrew를 사용한 설치
brew install node@18
brew install freelang

# 또는 nvm 사용
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
npm install -g freelang
```

#### Windows (WSL 권장)

```bash
# WSL2에서
wsl --install

# 이후 Linux 설치 가이드 따르기
```

### FreeLang 설치

```bash
# npm으로 설치
npm install -g freelang

# 또는 소스에서 빌드
git clone https://github.com/freelang/freelang.git
cd freelang
npm install
npm run build
npm link
```

### 시스템 경로에 등록

```bash
# 선택사항: 전역 명령어로 사용하려면
npm install -g /path/to/freelang-v4

# 또는 symlink 생성
ln -s /path/to/freelang-v4/src/commands/main.fl /usr/local/bin/gogs
chmod +x /usr/local/bin/gogs
```

## 설정

### 설정 파일 위치

```bash
~/.gogs/config.yaml
```

### 첫 번째 설정 (자동)

`gogs auth login` 명령으로 자동 생성됩니다:

```bash
fl src/commands/main.fl auth login \
  --host https://gogs.example.com \
  --token YOUR_TOKEN
```

생성된 `~/.gogs/config.yaml`:

```yaml
default_host: gogs

hosts:
  - name: gogs
    url: https://gogs.example.com
    token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    default: true

cache:
  ttl: 300
  enabled: true

batch:
  workers: 4
  timeout: 30000

logging:
  level: info
  format: json
```

### 다중 호스트 설정

여러 Gogs 서버를 관리할 수 있습니다:

```bash
# 두 번째 호스트 추가
fl src/commands/main.fl auth login \
  --host https://gogs2.example.com \
  --token TOKEN2

# 설정 파일 수동 편집
vim ~/.gogs/config.yaml
```

수정된 `~/.gogs/config.yaml`:

```yaml
default_host: gogs

hosts:
  - name: gogs
    url: https://gogs.example.com
    token: token1
    default: true

  - name: gogs2
    url: https://gogs2.example.com
    token: token2
    default: false

cache:
  ttl: 300
  enabled: true

batch:
  workers: 4
  timeout: 30000

logging:
  level: info
  format: json
```

### 환경 변수

```bash
# 기본 설정 (생략 시 config.yaml 사용)
export GOGS_HOST=https://gogs.dclub.kr
export GOGS_TOKEN=your_token_here

# 성능 설정
export GOGS_CACHE_TTL=300       # 캐시 유효시간 (초)
export GOGS_BATCH_WORKERS=4     # 배치 병렬 워커 수
export GOGS_TIMEOUT=30000       # 네트워크 타임아웃 (ms)

# 로깅 설정
export GOGS_LOG_LEVEL=info      # debug, info, warn, error
```

## 인증 토큰 생성

### GitHub 토큰 (GitHub Gogs 서버용)

1. https://github.com/settings/tokens에 접속
2. "Generate new token" 클릭
3. 다음 권한 선택:
   - `repo` - 저장소 접근
   - `user` - 사용자 정보
   - `admin:org` - 조직 관리
4. "Generate token" 클릭
5. 토큰 복사

### Gogs 서버 토큰 (개인 Gogs 서버용)

1. Gogs 서버에 로그인
2. `Settings` → `Applications` 접속
3. "Generate New Token" 클릭
4. 설명 입력 (예: "CLI")
5. "Generate Token" 클릭
6. 토큰 복사

## 첫 사용 예제

### 1. 저장소 목록 조회

```bash
fl src/commands/main.fl repo list
```

출력:
```
my-app
my-library
test-project
```

### 2. 저장소 생성

```bash
fl src/commands/main.fl repo create test-repo \
  --description "My test repository" \
  --private
```

출력:
```
✓ Repository 'test-repo' created successfully
  ID: 1
  URL: https://gogs.dclub.kr/username/test-repo
  Private: yes
```

### 3. 저장소 상세 정보

```bash
fl src/commands/main.fl repo view test-repo
```

출력:
```
Name: test-repo
Full Name: username/test-repo
Description: My test repository
URL: https://gogs.dclub.kr/username/test-repo
Private: yes
Watchers: 1
Stars: 0
Forks: 0
```

### 4. 배치 작업

`repos.yaml` 파일 생성:

```yaml
repos:
  - name: project-a
    description: "First project"
    private: false

  - name: project-b
    description: "Second project"
    private: true

  - name: project-c
    description: "Third project"
    private: false
```

실행:

```bash
fl src/commands/main.fl batch ensure repos.yaml --workers 4
```

출력:
```
Processing 3 repositories with 4 workers...
✓ project-a: created
✓ project-b: created
✓ project-c: created
Done in 1.2s
```

### 5. 캐시 활용

```bash
# 첫 실행 (API 호출)
time fl src/commands/main.fl repo list
# real 0m0.250s

# 두 번째 실행 (캐시 히트)
time fl src/commands/main.fl repo list
# real 0m0.001s
```

## 문제 해결

### "Not logged in" 에러

**증상**: `Not logged in. Run: gogs auth login`

**해결**:
```bash
fl src/commands/main.fl auth login \
  --host https://your-gogs-server.com \
  --token YOUR_TOKEN
```

### "Authentication failed" 에러

**증상**: `401 Unauthorized`

**해결**:
1. 토큰이 올바른지 확인
2. 토큰이 만료되지 않았는지 확인
3. 토큰 재생성 후 다시 로그인

```bash
# 토큰 재생성 후
fl src/commands/main.fl auth login \
  --host https://your-gogs-server.com \
  --token NEW_TOKEN
```

### "Connection refused" 에러

**증상**: `ECONNREFUSED: Connection refused`

**해결**:
1. Gogs 서버 주소 확인
2. Gogs 서버 실행 확인
3. 네트워크 연결 확인

```bash
# 서버 핑 테스트
ping gogs.dclub.kr

# HTTPS 연결 테스트
curl -I https://gogs.dclub.kr
```

### "Command not found" 에러

**증상**: `command not found: gogs`

**해결**:
1. CLI를 전역으로 설치했는지 확인
2. 경로가 `$PATH`에 포함되어 있는지 확인

```bash
# 현재 경로에서 실행
cd freelang-v4
fl src/commands/main.fl --version

# 또는 전체 경로로 실행
/path/to/freelang-v4/src/commands/main.fl --version
```

### 캐시 문제

**증상**: 최근 생성한 저장소가 목록에 나타나지 않음

**해결**: 캐시 비활성화

```bash
# 환경 변수로 비활성화
export GOGS_CACHE_TTL=0
fl src/commands/main.fl repo list

# 또는 설정 파일에서 수정
# ~/.gogs/config.yaml
cache:
  enabled: false
```

## 업그레이드

### 새 버전으로 업그레이드

```bash
cd freelang-v4
git pull origin main
npm install
```

### 버전 확인

```bash
fl src/commands/main.fl --version
```

## 시작 스크립트

### bash alias 설정

`~/.bashrc` 또는 `~/.zshrc`에 추가:

```bash
alias gogs='fl /path/to/freelang-v4/src/commands/main.fl'
```

이후 사용:
```bash
gogs repo list
gogs auth status
```

### Systemd 서비스 (고급)

`/etc/systemd/system/gogs-cli.service` 생성:

```ini
[Unit]
Description=Gogs CLI Daemon
After=network.target

[Service]
Type=simple
User=gogs
WorkingDirectory=/opt/freelang-v4
ExecStart=/usr/bin/node /opt/freelang-v4/src/commands/main.fl
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

활성화:
```bash
sudo systemctl enable gogs-cli
sudo systemctl start gogs-cli
```

## 다음 단계

- [README](GOGS_CLI_README.md) - 사용 예제
- [API 문서](API.md) - 102개 API 메서드
- [마이그레이션 가이드](MIGRATION.md) - Go gogs-cli에서 마이그레이션

---

**설치 가이드 v1.0 - 2026-04-01**
