# Phase 4: API 서비스 구현 계획

**시작일**: 2026-04-01
**모드**: 에이전트 자동 실행
**목표**: 7개 API 서비스 완성
**일정**: 2주 (병렬 진행)

---

## 📋 구현 순서

### Batch 1: 기본 서비스 (병렬)
- [ ] `src/api/repo.fl` - RepoService (400라인)
- [ ] `src/api/user.fl` - UserService (300라인)
- [ ] `src/api/org.fl` - OrgService (250라인)

### Batch 2: 협업 서비스 (병렬)
- [ ] `src/api/team.fl` - TeamService (200라인)
- [ ] `src/api/issue.fl` - IssueService (250라인)
- [ ] `src/api/webhook.fl` - WebhookService (200라인)
- [ ] `src/api/deploy_key.fl` - DeployKeyService (150라인)

### Batch 3: 통합 & 테스트
- [ ] `test_gogs_phase4.fl` - 통합 테스트
- [ ] 문서화

---

## 🏗️ 각 서비스 구조

### 템플릿

```freelang
struct [Service]Service {
    client: HttpClient
    cache: CacheManager
}

impl [Service]Service {
    // 1. CRUD
    async fn list() -> Result<[Model]>
    async fn get(id: str) -> Result<Model>
    async fn create(req: CreateRequest) -> Result<Model>
    async fn update(id: str, req: UpdateRequest) -> Result<Model>
    async fn delete(id: str) -> Result<str>

    // 2. ensure
    async fn ensure(req: CreateRequest) -> Result<EnsureAction>
}
```

---

## 📝 RepoService 상세

```freelang
struct RepoService {
    client: HttpClient
    cache: CacheManager
}

impl RepoService {
    async fn list() -> Result<[Repo]>
    async fn get(owner: str, name: str) -> Result<Repo>
    async fn create(req: CreateRepoRequest) -> Result<Repo>
    async fn update(owner: str, name: str, req: CreateRepoRequest) -> Result<Repo>
    async fn delete(owner: str, name: str) -> Result<str>
    async fn ensure(owner: str, name: str, req: CreateRepoRequest) -> Result<EnsureAction>

    // 추가
    async fn fork(owner: str, name: str) -> Result<Repo>
    async fn list_branches(owner: str, name: str) -> Result<[str]>
}
```

---

## 🎯 구현 목표

- ✅ 모든 메서드 async
- ✅ Result<T> 에러 처리
- ✅ ensure 패턴 적용
- ✅ 캐싱 통합
- ✅ 타입 안정성

---

## ✅ 완료 기준

1. 7개 서비스 구현
2. 각 서비스 최소 5개 메서드
3. 에러 처리 완벽
4. ensure 패턴 적용
5. 테스트 파일 작성

---

## 🚀 시작 신호

준비 완료! 에이전트 모드 실행 대기 중...
