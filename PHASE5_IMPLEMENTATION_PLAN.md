# Phase 5: CLI 명령어 구현 계획

**시작일**: 2026-04-01
**모드**: 에이전트 자동 실행
**목표**: 30+ CLI 명령어 완성
**일정**: 2주 (병렬 진행)

---

## 📋 구현 명령어

### Batch 1: 인증 & 저장소 (병렬)
- [ ] `gogs auth login` - 로그인
- [ ] `gogs auth status` - 상태 확인
- [ ] `gogs repo create` - 저장소 생성
- [ ] `gogs repo list` - 저장소 목록
- [ ] `gogs repo view` - 저장소 상세
- [ ] `gogs repo delete` - 저장소 삭제
- [ ] `gogs repo ensure` - 저장소 동기화

### Batch 2: 사용자 & 조직 (병렬)
- [ ] `gogs user create` - 사용자 생성
- [ ] `gogs user list` - 사용자 목록
- [ ] `gogs user view` - 사용자 상세
- [ ] `gogs user delete` - 사용자 삭제
- [ ] `gogs org create` - 조직 생성
- [ ] `gogs org list` - 조직 목록
- [ ] `gogs org view` - 조직 상세

### Batch 3: 협업 & 자동화 (병렬)
- [ ] `gogs team create` - 팀 생성
- [ ] `gogs team list` - 팀 목록
- [ ] `gogs issue create` - 이슈 생성
- [ ] `gogs issue list` - 이슈 목록
- [ ] `gogs webhook create` - 훅 생성
- [ ] `gogs webhook list` - 훅 목록
- [ ] `gogs deploy-key add` - 배포키 추가
- [ ] `gogs deploy-key list` - 배포키 목록

### Batch 4: 배치 & 분석 (병렬)
- [ ] `gogs batch create` - 배치 생성
- [ ] `gogs batch ensure` - 배치 동기화
- [ ] `gogs batch delete` - 배치 삭제
- [ ] `gogs analyze` - 서버 분석

### Batch 5: 유틸리티 (병렬)
- [ ] `gogs config set` - 설정
- [ ] `gogs config get` - 설정 조회
- [ ] `gogs --version` - 버전
- [ ] `gogs --help` - 도움말

---

## 🏗️ CLI 명령어 구조

### 템플릿

```freelang
async fn cmd_repo_create(args: CliArgs) -> Result<str> {
    // 1. 인자 검증
    var name = get_positional(args, 0)
    if name == "" {
        return Result::Err(Error::MissingArg("repo name"))
    }

    // 2. 플래그 파싱
    var private = has_flag(args, "private")
    var description = get_flag(args, "description")

    // 3. 설정 로드
    var host = await get_default_host()

    // 4. 클라이언트 생성
    var client = new_client(host.url, host.token)

    // 5. API 호출
    var repo_service = RepoService { client: client, cache: cache }
    var result = await repo_service.create_repo(
        CreateRepoRequest {
            name: name,
            private: private,
            description: description
        }
    )

    // 6. 결과 처리
    match result {
        Result::Ok(repo) => {
            println("✓ Repository created: " + repo.html_url)
            Result::Ok("success")
        }
        Result::Err(err) => {
            println("✗ Error: " + error_message(err))
            Result::Err(err)
        }
    }
}
```

---

## 📁 파일 구조

```
freelang-v4/
└── src/commands/
    ├── auth.fl (150라인)
    ├── repo.fl (400라인)
    ├── user.fl (300라인)
    ├── org.fl (250라인)
    ├── team.fl (200라인)
    ├── issue.fl (250라인)
    ├── webhook.fl (200라인)
    ├── deploy_key.fl (200라인)
    ├── batch.fl (300라인)
    ├── config.fl (150라인)
    ├── analyze.fl (150라인)
    └── main.fl (main 엔트리 포인트)
```

---

## 🎯 구현 기준

각 명령어는 다음을 따를 것:

✅ **인자 검증**
- 필수 인자 확인
- 플래그 파싱

✅ **에러 처리**
- Result<T> 사용
- 친절한 에러 메시지

✅ **출력 포맷**
- 기본: 테이블 형식
- --json: JSON 출력
- --yaml: YAML 출력

✅ **캐싱 활용**
- 목록 조회는 캐시 사용
- 수정/삭제 후 캐시 무효화

✅ **진행 표시**
- 배치 작업은 진행률 표시
- 장시간 작업은 상태 메시지

---

## 🚀 시작 신호

준비 완료! 에이전트 모드 실행 대기 중...
