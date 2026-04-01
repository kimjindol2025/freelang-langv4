# gogs-cli-fl API 서비스 문서

7개 API 서비스, 102개 메서드의 완전한 문서입니다.

## 목차

1. [RepoService](#reposervice) - 17 메서드
2. [UserService](#userservice) - 15 메서드
3. [OrgService](#orgservice) - 13 메서드
4. [TeamService](#teamservice) - 14 메서드
5. [IssueService](#issueservice) - 15 메서드
6. [WebhookService](#webhookservice) - 15 메서드
7. [DeployKeyService](#deploykeyservice) - 13 메서드

---

## RepoService

저장소 관리 기능 (17개 메서드)

### list_repos()

모든 저장소 목록을 조회합니다.

```freelang
var repos = await repo_service.list_repos()
match repos {
    Result::Ok(list) => println("Repositories: " + to_string(length(list))),
    Result::Err(e) => println("Error: " + e.message)
}
```

**반환값**: `Result<[Repository]>`

---

### create_repo(request)

새 저장소를 생성합니다.

```freelang
var req = CreateRepoRequest {
    name: "myrepo",
    description: "My repository",
    private: false,
    auto_init: true
}
var repo = await repo_service.create_repo(req)
```

**매개변수**:
- `name` (string, 필수) - 저장소 이름
- `description` (string, 선택) - 설명
- `private` (bool, 선택) - 비공개 여부
- `auto_init` (bool, 선택) - README 자동 생성

**반환값**: `Result<Repository>`

---

### get_repo(owner, name)

저장소 상세 정보를 조회합니다.

```freelang
var repo = await repo_service.get_repo("username", "reponame")
match repo {
    Result::Ok(r) => println("Repo: " + r.name + " (" + r.full_name + ")"),
    Result::Err(e) => println("Not found")
}
```

**매개변수**:
- `owner` (string) - 소유자 이름
- `name` (string) - 저장소 이름

**반환값**: `Result<Repository>`

---

### delete_repo(owner, name)

저장소를 삭제합니다.

```freelang
var result = await repo_service.delete_repo("username", "reponame")
match result {
    Result::Ok(_) => println("Repository deleted"),
    Result::Err(e) => println("Error: " + e.message)
}
```

**매개변수**:
- `owner` (string) - 소유자 이름
- `name` (string) - 저장소 이름

**반환값**: `Result<()>`

---

### update_repo(owner, name, request)

저장소 정보를 업데이트합니다.

```freelang
var req = UpdateRepoRequest {
    description: "Updated description",
    private: true
}
var repo = await repo_service.update_repo("user", "repo", req)
```

**매개변수**:
- `owner` (string) - 소유자
- `name` (string) - 저장소 이름
- `request` (UpdateRepoRequest) - 업데이트 정보

**반환값**: `Result<Repository>`

---

### ensure_repo(name, request)

저장소를 멱등성 있게 동기화합니다 (없으면 생성, 있으면 업데이트).

```freelang
var repo = await repo_service.ensure_repo("myrepo", req)
```

**반환값**: `Result<Repository>`

---

### list_repos_by_user(username)

특정 사용자의 저장소 목록을 조회합니다.

```freelang
var repos = await repo_service.list_repos_by_user("username")
```

**반환값**: `Result<[Repository]>`

---

### list_repos_by_org(orgname)

특정 조직의 저장소 목록을 조회합니다.

```freelang
var repos = await repo_service.list_repos_by_org("orgname")
```

**반환값**: `Result<[Repository]>`

---

### get_repo_commits(owner, name, branch)

저장소의 커밋 목록을 조회합니다.

```freelang
var commits = await repo_service.get_repo_commits("user", "repo", "main")
```

**반환값**: `Result<[Commit]>`

---

### get_repo_branches(owner, name)

저장소의 브랜치 목록을 조회합니다.

```freelang
var branches = await repo_service.get_repo_branches("user", "repo")
```

**반환값**: `Result<[Branch]>`

---

### get_repo_tags(owner, name)

저장소의 태그 목록을 조회합니다.

```freelang
var tags = await repo_service.get_repo_tags("user", "repo")
```

**반환값**: `Result<[Tag]>`

---

### get_repo_issues(owner, name)

저장소의 이슈 목록을 조회합니다.

```freelang
var issues = await repo_service.get_repo_issues("user", "repo")
```

**반환값**: `Result<[Issue]>`

---

### get_repo_pulls(owner, name)

저장소의 Pull Request 목록을 조회합니다.

```freelang
var prs = await repo_service.get_repo_pulls("user", "repo")
```

**반환값**: `Result<[PullRequest]>`

---

### get_repo_watchers(owner, name)

저장소를 감시하는 사용자 목록을 조회합니다.

```freelang
var watchers = await repo_service.get_repo_watchers("user", "repo")
```

**반환값**: `Result<[User]>`

---

### get_repo_stargazers(owner, name)

저장소를 별표한 사용자 목록을 조회합니다.

```freelang
var stargazers = await repo_service.get_repo_stargazers("user", "repo")
```

**반환값**: `Result<[User]>`

---

### fork_repo(owner, name)

저장소를 포크합니다.

```freelang
var forked = await repo_service.fork_repo("original-owner", "original-repo")
```

**반환값**: `Result<Repository>`

---

## UserService

사용자 관리 기능 (15개 메서드)

### list_users()

모든 사용자 목록을 조회합니다.

```freelang
var users = await user_service.list_users()
match users {
    Result::Ok(list) => println("Users: " + to_string(length(list))),
    Result::Err(e) => println("Error: " + e.message)
}
```

**반환값**: `Result<[User]>`

---

### create_user(request)

새 사용자를 생성합니다.

```freelang
var req = CreateUserRequest {
    username: "newuser",
    email: "user@example.com",
    password: "securepass",
    full_name: "New User"
}
var user = await user_service.create_user(req)
```

**매개변수**:
- `username` (string, 필수) - 사용자명
- `email` (string, 필수) - 이메일
- `password` (string, 필수) - 비밀번호
- `full_name` (string, 선택) - 전체 이름

**반환값**: `Result<User>`

---

### get_user(username)

사용자 정보를 조회합니다.

```freelang
var user = await user_service.get_user("username")
```

**반환값**: `Result<User>`

---

### delete_user(username)

사용자를 삭제합니다.

```freelang
var result = await user_service.delete_user("username")
```

**반환값**: `Result<()>`

---

### update_user(username, request)

사용자 정보를 업데이트합니다.

```freelang
var req = UpdateUserRequest {
    email: "newemail@example.com",
    full_name: "Updated Name"
}
var user = await user_service.update_user("username", req)
```

**반환값**: `Result<User>`

---

### get_user_repos(username)

사용자의 저장소 목록을 조회합니다.

```freelang
var repos = await user_service.get_user_repos("username")
```

**반환값**: `Result<[Repository]>`

---

### get_user_orgs(username)

사용자가 속한 조직 목록을 조회합니다.

```freelang
var orgs = await user_service.get_user_orgs("username")
```

**반환값**: `Result<[Organization]>`

---

### follow_user(username)

사용자를 팔로우합니다.

```freelang
var result = await user_service.follow_user("username")
```

**반환값**: `Result<()>`

---

### unfollow_user(username)

사용자를 언팔로우합니다.

```freelang
var result = await user_service.unfollow_user("username")
```

**반환값**: `Result<()>`

---

### get_user_followers(username)

사용자의 팔로워 목록을 조회합니다.

```freelang
var followers = await user_service.get_user_followers("username")
```

**반환값**: `Result<[User]>`

---

### get_user_following(username)

사용자가 팔로우하는 사용자 목록을 조회합니다.

```freelang
var following = await user_service.get_user_following("username")
```

**반환값**: `Result<[User]>`

---

### is_following(username)

특정 사용자를 팔로우하는지 확인합니다.

```freelang
var following = await user_service.is_following("username")
```

**반환값**: `Result<bool>`

---

### get_user_keys(username)

사용자의 SSH 키 목록을 조회합니다.

```freelang
var keys = await user_service.get_user_keys("username")
```

**반환값**: `Result<[PublicKey]>`

---

### get_current_user()

현재 로그인한 사용자 정보를 조회합니다.

```freelang
var me = await user_service.get_current_user()
match me {
    Result::Ok(user) => println("Logged in as: " + user.username),
    Result::Err(e) => println("Not logged in")
}
```

**반환값**: `Result<User>`

---

## OrgService

조직 관리 기능 (13개 메서드)

### list_orgs()

모든 조직 목록을 조회합니다.

```freelang
var orgs = await org_service.list_orgs()
```

**반환값**: `Result<[Organization]>`

---

### create_org(request)

새 조직을 생성합니다.

```freelang
var req = CreateOrgRequest {
    username: "myorg",
    full_name: "My Organization",
    description: "Organization description"
}
var org = await org_service.create_org(req)
```

**반환값**: `Result<Organization>`

---

### get_org(name)

조직 정보를 조회합니다.

```freelang
var org = await org_service.get_org("orgname")
```

**반환값**: `Result<Organization>`

---

### delete_org(name)

조직을 삭제합니다.

```freelang
var result = await org_service.delete_org("orgname")
```

**반환값**: `Result<()>`

---

### update_org(name, request)

조직 정보를 업데이트합니다.

```freelang
var req = UpdateOrgRequest {
    description: "Updated description"
}
var org = await org_service.update_org("orgname", req)
```

**반환값**: `Result<Organization>`

---

### list_org_members(name)

조직 멤버 목록을 조회합니다.

```freelang
var members = await org_service.list_org_members("orgname")
```

**반환값**: `Result<[User]>`

---

### add_org_member(org, username)

조직에 멤버를 추가합니다.

```freelang
var result = await org_service.add_org_member("orgname", "username")
```

**반환값**: `Result<()>`

---

### remove_org_member(org, username)

조직에서 멤버를 제거합니다.

```freelang
var result = await org_service.remove_org_member("orgname", "username")
```

**반환값**: `Result<()>`

---

### is_org_member(org, username)

사용자가 조직 멤버인지 확인합니다.

```freelang
var is_member = await org_service.is_org_member("orgname", "username")
```

**반환값**: `Result<bool>`

---

### list_org_repos(name)

조직의 저장소 목록을 조회합니다.

```freelang
var repos = await org_service.list_org_repos("orgname")
```

**반환값**: `Result<[Repository]>`

---

### get_org_member_role(org, username)

조직 내 사용자의 역할을 조회합니다.

```freelang
var role = await org_service.get_org_member_role("orgname", "username")
```

**반환값**: `Result<string>`

---

### set_org_member_role(org, username, role)

조직 내 사용자의 역할을 설정합니다.

```freelang
var result = await org_service.set_org_member_role("orgname", "username", "member")
```

**반환값**: `Result<()>`

---

## TeamService

팀 관리 기능 (14개 메서드)

### create_team(org, request)

새 팀을 생성합니다.

```freelang
var req = CreateTeamRequest {
    name: "myteam",
    description: "Development team",
    permission: "push"
}
var team = await team_service.create_team("orgname", req)
```

**반환값**: `Result<Team>`

---

### list_org_teams(org)

조직의 팀 목록을 조회합니다.

```freelang
var teams = await team_service.list_org_teams("orgname")
```

**반환값**: `Result<[Team]>`

---

### get_team(org, teamname)

팀 정보를 조회합니다.

```freelang
var team = await team_service.get_team("orgname", "teamname")
```

**반환값**: `Result<Team>`

---

### delete_team(org, teamname)

팀을 삭제합니다.

```freelang
var result = await team_service.delete_team("orgname", "teamname")
```

**반환값**: `Result<()>`

---

### update_team(org, teamname, request)

팀 정보를 업데이트합니다.

```freelang
var req = UpdateTeamRequest {
    description: "Updated description"
}
var team = await team_service.update_team("orgname", "teamname", req)
```

**반환값**: `Result<Team>`

---

### list_team_members(org, teamname)

팀 멤버 목록을 조회합니다.

```freelang
var members = await team_service.list_team_members("orgname", "teamname")
```

**반환값**: `Result<[User]>`

---

### add_team_member(org, teamname, username)

팀에 멤버를 추가합니다.

```freelang
var result = await team_service.add_team_member("orgname", "teamname", "username")
```

**반환값**: `Result<()>`

---

### remove_team_member(org, teamname, username)

팀에서 멤버를 제거합니다.

```freelang
var result = await team_service.remove_team_member("orgname", "teamname", "username")
```

**반환값**: `Result<()>`

---

### list_team_repos(org, teamname)

팀의 저장소 목록을 조회합니다.

```freelang
var repos = await team_service.list_team_repos("orgname", "teamname")
```

**반환값**: `Result<[Repository]>`

---

### add_team_repo(org, teamname, repo)

팀에 저장소를 추가합니다.

```freelang
var result = await team_service.add_team_repo("orgname", "teamname", "reponame")
```

**반환값**: `Result<()>`

---

### remove_team_repo(org, teamname, repo)

팀에서 저장소를 제거합니다.

```freelang
var result = await team_service.remove_team_repo("orgname", "teamname", "reponame")
```

**반환값**: `Result<()>`

---

### is_team_member(org, teamname, username)

사용자가 팀 멤버인지 확인합니다.

```freelang
var is_member = await team_service.is_team_member("orgname", "teamname", "username")
```

**반환값**: `Result<bool>`

---

### get_team_permission(org, teamname, repo)

팀이 저장소에 대해 가진 권한을 조회합니다.

```freelang
var perm = await team_service.get_team_permission("orgname", "teamname", "reponame")
```

**반환값**: `Result<string>`

---

## IssueService

이슈 관리 기능 (15개 메서드)

### create_issue(owner, repo, request)

새 이슈를 생성합니다.

```freelang
var req = CreateIssueRequest {
    title: "Bug: Login fails",
    body: "Cannot login with email address",
    assignee: "username",
    labels: ["bug", "critical"]
}
var issue = await issue_service.create_issue("owner", "repo", req)
```

**반환값**: `Result<Issue>`

---

### list_issues(owner, repo)

저장소의 이슈 목록을 조회합니다.

```freelang
var issues = await issue_service.list_issues("owner", "repo")
```

**반환값**: `Result<[Issue]>`

---

### get_issue(owner, repo, index)

이슈를 조회합니다.

```freelang
var issue = await issue_service.get_issue("owner", "repo", 1)
```

**매개변수**:
- `owner` (string) - 저장소 소유자
- `repo` (string) - 저장소 이름
- `index` (i32) - 이슈 번호

**반환값**: `Result<Issue>`

---

### close_issue(owner, repo, index)

이슈를 종료합니다.

```freelang
var result = await issue_service.close_issue("owner", "repo", 1)
```

**반환값**: `Result<()>`

---

### reopen_issue(owner, repo, index)

이슈를 재개합니다.

```freelang
var result = await issue_service.reopen_issue("owner", "repo", 1)
```

**반환값**: `Result<()>`

---

### update_issue(owner, repo, index, request)

이슈를 업데이트합니다.

```freelang
var req = UpdateIssueRequest {
    title: "Updated title",
    body: "Updated body"
}
var issue = await issue_service.update_issue("owner", "repo", 1, req)
```

**반환값**: `Result<Issue>`

---

### list_issue_comments(owner, repo, index)

이슈의 댓글 목록을 조회합니다.

```freelang
var comments = await issue_service.list_issue_comments("owner", "repo", 1)
```

**반환값**: `Result<[Comment]>`

---

### create_issue_comment(owner, repo, index, body)

이슈에 댓글을 추가합니다.

```freelang
var comment = await issue_service.create_issue_comment("owner", "repo", 1, "Great idea!")
```

**반환값**: `Result<Comment>`

---

### get_issue_comment(owner, repo, commentid)

댓글을 조회합니다.

```freelang
var comment = await issue_service.get_issue_comment("owner", "repo", 123)
```

**반환값**: `Result<Comment>`

---

### delete_issue_comment(owner, repo, commentid)

댓글을 삭제합니다.

```freelang
var result = await issue_service.delete_issue_comment("owner", "repo", 123)
```

**반환값**: `Result<()>`

---

### update_issue_comment(owner, repo, commentid, body)

댓글을 업데이트합니다.

```freelang
var comment = await issue_service.update_issue_comment("owner", "repo", 123, "Updated comment")
```

**반환값**: `Result<Comment>`

---

### assign_issue(owner, repo, index, assignee)

이슈를 할당합니다.

```freelang
var result = await issue_service.assign_issue("owner", "repo", 1, "username")
```

**반환값**: `Result<()>`

---

### unassign_issue(owner, repo, index)

이슈 할당을 해제합니다.

```freelang
var result = await issue_service.unassign_issue("owner", "repo", 1)
```

**반환값**: `Result<()>`

---

### add_issue_labels(owner, repo, index, labels)

이슈에 레이블을 추가합니다.

```freelang
var result = await issue_service.add_issue_labels("owner", "repo", 1, ["bug", "critical"])
```

**반환값**: `Result<()>`

---

### remove_issue_labels(owner, repo, index, labels)

이슈에서 레이블을 제거합니다.

```freelang
var result = await issue_service.remove_issue_labels("owner", "repo", 1, ["bug"])
```

**반환값**: `Result<()>`

---

## WebhookService

웹훅 관리 기능 (15개 메서드)

### create_webhook(owner, repo, request)

새 웹훅을 생성합니다.

```freelang
var req = CreateWebhookRequest {
    url: "https://example.com/webhook",
    events: ["push", "pull_request"],
    active: true
}
var webhook = await webhook_service.create_webhook("owner", "repo", req)
```

**반환값**: `Result<Webhook>`

---

### list_webhooks(owner, repo)

저장소의 웹훅 목록을 조회합니다.

```freelang
var webhooks = await webhook_service.list_webhooks("owner", "repo")
```

**반환값**: `Result<[Webhook]>`

---

### get_webhook(owner, repo, id)

웹훅을 조회합니다.

```freelang
var webhook = await webhook_service.get_webhook("owner", "repo", 1)
```

**반환값**: `Result<Webhook>`

---

### delete_webhook(owner, repo, id)

웹훅을 삭제합니다.

```freelang
var result = await webhook_service.delete_webhook("owner", "repo", 1)
```

**반환값**: `Result<()>`

---

### update_webhook(owner, repo, id, request)

웹훅을 업데이트합니다.

```freelang
var req = UpdateWebhookRequest {
    url: "https://example.com/new-webhook"
}
var webhook = await webhook_service.update_webhook("owner", "repo", 1, req)
```

**반환값**: `Result<Webhook>`

---

### test_webhook(owner, repo, id)

웹훅을 테스트합니다.

```freelang
var result = await webhook_service.test_webhook("owner", "repo", 1)
```

**반환값**: `Result<()>`

---

### enable_webhook(owner, repo, id)

웹훅을 활성화합니다.

```freelang
var result = await webhook_service.enable_webhook("owner", "repo", 1)
```

**반환값**: `Result<()>`

---

### disable_webhook(owner, repo, id)

웹훅을 비활성화합니다.

```freelang
var result = await webhook_service.disable_webhook("owner", "repo", 1)
```

**반환값**: `Result<()>`

---

### get_webhook_deliveries(owner, repo, id)

웹훅의 전달 기록을 조회합니다.

```freelang
var deliveries = await webhook_service.get_webhook_deliveries("owner", "repo", 1)
```

**반환값**: `Result<[WebhookDelivery]>`

---

### get_webhook_delivery(owner, repo, id, deliveryid)

특정 전달 기록을 조회합니다.

```freelang
var delivery = await webhook_service.get_webhook_delivery("owner", "repo", 1, 100)
```

**반환값**: `Result<WebhookDelivery>`

---

### redeliver_webhook(owner, repo, id, deliveryid)

웹훅을 재전달합니다.

```freelang
var result = await webhook_service.redeliver_webhook("owner", "repo", 1, 100)
```

**반환값**: `Result<()>`

---

---

## DeployKeyService

배포 키 관리 기능 (13개 메서드)

### create_deploy_key(owner, repo, request)

새 배포 키를 생성합니다.

```freelang
var req = CreateDeployKeyRequest {
    title: "CI/CD Key",
    key: "ssh-rsa AAAA...",
    read_only: false
}
var key = await deploy_key_service.create_deploy_key("owner", "repo", req)
```

**반환값**: `Result<DeployKey>`

---

### list_deploy_keys(owner, repo)

저장소의 배포 키 목록을 조회합니다.

```freelang
var keys = await deploy_key_service.list_deploy_keys("owner", "repo")
```

**반환값**: `Result<[DeployKey]>`

---

### get_deploy_key(owner, repo, id)

배포 키를 조회합니다.

```freelang
var key = await deploy_key_service.get_deploy_key("owner", "repo", 1)
```

**반환값**: `Result<DeployKey>`

---

### delete_deploy_key(owner, repo, id)

배포 키를 삭제합니다.

```freelang
var result = await deploy_key_service.delete_deploy_key("owner", "repo", 1)
```

**반환값**: `Result<()>`

---

### update_deploy_key(owner, repo, id, request)

배포 키를 업데이트합니다.

```freelang
var req = UpdateDeployKeyRequest {
    title: "Updated Key Title"
}
var key = await deploy_key_service.update_deploy_key("owner", "repo", 1, req)
```

**반환값**: `Result<DeployKey>`

---

### enable_deploy_key(owner, repo, id)

배포 키를 활성화합니다.

```freelang
var result = await deploy_key_service.enable_deploy_key("owner", "repo", 1)
```

**반환값**: `Result<()>`

---

### disable_deploy_key(owner, repo, id)

배포 키를 비활성화합니다.

```freelang
var result = await deploy_key_service.disable_deploy_key("owner", "repo", 1)
```

**반환값**: `Result<()>`

---

---

## 공통 패턴

### Result<T> 패턴

모든 API 메서드는 `Result<T>` 타입을 반환합니다:

```freelang
match api_call {
    Result::Ok(value) => {
        // 성공 처리
        println("Success: " + to_string(value))
    },
    Result::Err(error) => {
        // 에러 처리
        println("Error: " + error.message)
        // error.code: HTTP 상태 코드
        // error.details: 상세 정보
    }
}
```

### 캐싱 적용

모든 read 메서드는 캐싱을 지원합니다:

```freelang
var cache = new_cache(300)  // 5분 TTL

// 첫 호출: API에서 조회
var repos = await repo_service.list_repos(cache)

// 두 번째 호출: 캐시에서 반환 (1ms 이하)
var repos = await repo_service.list_repos(cache)
```

### 페이지네이션

대용량 목록은 페이지네이션을 지원합니다:

```freelang
var req = ListRequest {
    page: 1,
    page_size: 20
}
var repos = await repo_service.list_repos_paginated(req, cache)
```

---

## 에러 처리

### HTTP 상태 코드

- `200 OK` - 성공
- `201 Created` - 리소스 생성
- `204 No Content` - 성공하지만 응답 본문 없음
- `400 Bad Request` - 잘못된 요청
- `401 Unauthorized` - 인증 실패
- `403 Forbidden` - 권한 없음
- `404 Not Found` - 리소스 없음
- `500 Internal Server Error` - 서버 에러

### 에러 처리 예제

```freelang
match result {
    Result::Ok(value) => println("Success"),
    Result::Err(e) => {
        if e.code == 404 {
            println("Resource not found")
        } else if e.code == 401 {
            println("Authentication required. Run: gogs auth login")
        } else {
            println("Error: " + e.message)
        }
    }
}
```

---

**API 문서 v1.0 - 2026-04-01**
