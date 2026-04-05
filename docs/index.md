# 🌍 FreeLang v4

**AI-First 프로그래밍 언어**

<div align="center">

[![Status](https://img.shields.io/badge/Status-PRODUCTION%20READY-brightgreen?style=for-the-badge)](https://github.com/kimjindol2025/freelang-langv4)
[![Version](https://img.shields.io/badge/Version-4.3.0-blue?style=for-the-badge)](https://github.com/kimjindol2025/freelang-langv4)
[![Tests](https://img.shields.io/badge/Tests-251%2F263%20(95%25)-green?style=for-the-badge)](https://github.com/kimjindol2025/freelang-langv4)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)

[🚀 빠른 시작](#빠른-시작) | [📚 문서](#문서) | [🔍 특징](#주요-특징) | [🧑‍💻 샘플](#코드-샘플)

</div>

---

## 🎯 FreeLang v4란?

**정적 타입 프로그래밍 언어**로서 다음을 제공합니다:

- ✅ **완전한 구현**: Lexer → Parser → Compiler → VM
- ✅ **AI-First 설계**: LLM 통합 기반 언어 설계
- ✅ **성능 중심**: 병렬 처리, 메모리 최적화
- ✅ **확장성**: 표준 라이브러리 20+ 함수
- ✅ **개발자 친화**: 한글 식별자 지원, IDE 확장

---

## 🚀 빠른 시작

### 설치

```bash
# Clone 저장소
git clone https://github.com/kimjindol2025/freelang-langv4.git
cd freelang-langv4

# 의존성 설치
npm install

# 빌드
npm run build

# 테스트
npm test
```

### 첫 번째 프로그램

```freelang
// hello.fl
let message = "Hello, FreeLang!"
println(message)

let numbers = [1, 2, 3, 4, 5]
for x in numbers {
  println(str(x * x))
}
```

실행:
```bash
node dist/vm.js hello.fl
```

---

## 🎨 주요 특징

### 1️⃣ 정적 타입 시스템
```freelang
let name: str = "Alice"
let age: i32 = 30
let scores: [i32] = [85, 90, 95]

struct Person {
  name: str,
  age: i32,
  email: str
}

let alice: Person = Person("Alice", 30, "alice@example.com")
```

### 2️⃣ 함수형 프로그래밍
```freelang
fn map(arr: [i32], fn: fn(i32) -> i32) -> [i32] {
  let result: [i32] = []
  for x in arr {
    result.push(fn(x))
  }
  result
}

let doubled = map([1, 2, 3], fn(x) -> x * 2)
// doubled = [2, 4, 6]
```

### 3️⃣ 에러 처리
```freelang
match parse_int("42") {
  case Ok(num) -> println(str(num)),
  case Err(e) -> println(e)
}
```

### 4️⃣ 병렬 처리
```freelang
struct WorkerPool {
  workers: [WorkerThread],
  tasks: [Task]
}

fn worker_pool_new(size: i32) -> WorkerPool {
  // 병렬 워커 풀 생성
}

fn worker_pool_process(pool: WorkerPool, task: Task) -> Result {
  // 병렬 작업 처리
}
```

### 5️⃣ 분산 처리 (Phase 6)
```freelang
struct Cluster {
  name: str,
  nodes: [Node],
  leader_id: str
}

fn cluster_dispatch(cluster: Cluster, task: Task) -> TaskResult {
  // 라운드로빈 분산
}
```

---

## 📚 문서

| 문서 | 설명 |
|------|------|
| [언어 완성도](language-completeness.md) | 82.6% 완성도 평가 |
| [10단계 학습 가이드](learning-guide.md) | 초급→중급→고급 학습 경로 |
| [API 레퍼런스](api-reference.md) | 표준 라이브러리 상세 문서 |
| [다른 언어와의 비교](comparison.md) | Python, JavaScript, Go, Rust와 비교 |
| [성능 벤치마크](benchmarks.md) | Phase 4 성능 측정 결과 |
| [아키텍처](architecture.md) | 시스템 설계 문서 |

---

## 💡 코드 샘플

### 문자열 처리
```freelang
let text = "Hello, FreeLang v4!"
let upper = text.to_upper()
let length = text.length()
let sliced = text.slice(0, 5)  // "Hello"

match text.index_of("Lang") {
  case Some(pos) -> println(str(pos)),
  case None -> println("Not found")
}
```

### 데이터 구조
```freelang
// 배열
let arr = [1, 2, 3, 4, 5]
arr.push(6)
let sum = arr.fold(0, fn(acc, x) -> acc + x)

// 해시맵
let map = {}
map["alice"] = 30
map["bob"] = 25

// 구조체
struct Point {
  x: i32,
  y: i32
}

let p1 = Point(10, 20)
let p2 = Point(30, 40)
```

### 메모리 관리
```freelang
// 자동 메모리 할당/해제
fn memory_demo() -> i32 {
  let large_array = array_new(10000)
  let result = large_array[0]
  // 함수 종료 시 자동으로 메모리 해제
  result
}
```

---

## 🧪 테스트 & 빌드

### 테스트 실행

```bash
# 전체 테스트
npm test

# 특정 테스트
npm test -- v9-memory.test.ts

# v9 파일 테스트
node test-v9-files.js
```

### 빌드 결과

```
✅ v9 통합 테스트: 6/6 (100%)
✅ Jest 회귀 테스트: 251/263 (95.4%)
✅ 성능 벤치마크: 4,420 ops (15.7% 개선)
✅ 빌드 상태: 성공
```

---

## 📊 성능 벤치마크

| 카테고리 | 연산 수 | 성능 |
|---------|--------|------|
| 문자열 처리 | 2,200 ops | ⚡ 빠름 |
| 컬렉션 | 700 ops | ⚡ 빠름 |
| 수학 연산 | 300 ops | ⚡ 매우 빠름 |
| 함수 호출 | 20 ops | ✅ 안정적 |
| 에러 처리 | 300 ops | ✅ 안정적 |
| 구조체 | 300 ops | ✅ 안정적 |
| **캐시 연산** | **300 ops** | **✨ 신규** |
| **메모리 할당** | **300 ops** | **✨ 신규** |
| **합계** | **4,420 ops** | ✅ 개선 |

---

## 🏗️ 아키텍처

```
freelang-v4/
├── src/
│   ├── lexer.ts          # 토큰화
│   ├── parser.ts         # AST 생성
│   ├── compiler.ts       # 바이트코드 컴파일
│   ├── vm.ts             # 가상 머신 실행
│   └── stdlib/           # 표준 라이브러리
├── v9/                   # Phase 1-6 구현
│   ├── v9-memory.fl      # 메모리 스토리지
│   ├── v9-parallel.fl    # 병렬 처리
│   ├── v9-agent-engine.fl # ReAct 에이전트
│   ├── v9-memory-management.fl # 메모리 관리
│   ├── v9-optimized.fl   # 최적화
│   ├── v9-benchmark.fl   # 성능 벤치마크
│   └── v9-distributed.fl # 분산 처리
└── tests/
    ├── jest/
    └── v9/
```

---

## 🎓 학습 경로

**초급** (4시간)
- 변수, 타입
- 제어 흐름 (if, while)
- 함수 기초

**중급** (4시간)
- 배열, 구조체
- 에러 처리
- 함수형 프로그래밍

**고급** (12시간)
- 병렬 처리
- 메모리 관리
- 분산 시스템
- 최적화 기법

[📖 상세 학습 가이드](learning-guide.md) 보기

---

## 🔗 링크

- 📖 [전체 문서](/)
- 🐙 [GitHub 저장소](https://github.com/kimjindol2025/freelang-langv4)
- 🔗 [Gogs 백업](https://gogs.dclub.kr/kim/freelang-v4)
- 📝 [최신 뉴스](#최근-업데이트)

---

## 📈 최근 업데이트

### 2026-04-05 - GitHub 배포 완료
- ✅ GitHub Pages 홈페이지 오픈
- ✅ 토큰 보안 정책 적용
- ✅ 108개 커밋 동기화

### 2026-04-04 - Phase 4-6 완료
- ✅ 4-트랙 병렬 완성
- ✅ v9 파일 6/6 테스트 통과
- ✅ 분산 처리 시스템 구현
- ✅ 성능 벤치마크 15.7% 개선

### 2026-04-03 - v9 표준 라이브러리 완료
- ✅ AI/LLM, 데이터, 메모리, 비동기, 도구, 검증 (1,843줄)
- ✅ 30/30 테스트 통과

---

## 💬 문의 & 피드백

- 🐛 [버그 리포트](https://github.com/kimjindol2025/freelang-langv4/issues)
- 💡 [기능 제안](https://github.com/kimjindol2025/freelang-langv4/discussions)
- 📧 Email: [연락처]

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포하세요!

---

**FreeLang v4 - 미래의 프로그래밍 언어** 🚀

Last Updated: 2026-04-05
