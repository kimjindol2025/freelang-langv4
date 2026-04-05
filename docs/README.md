# 🌍 FreeLang v4

**AI-First 프로그래밍 언어**

> 완전한 구현 + 성능 중심 + 확장성 높음

---

## 🎯 소개

FreeLang v4는 **정적 타입 프로그래밍 언어**로서 다음을 제공합니다:

- ✅ **완전한 구현**: Lexer → Parser → Compiler → VM
- ✅ **AI-First 설계**: LLM 통합 기반 언어
- ✅ **성능 중심**: 병렬 처리, 메모리 최적화
- ✅ **프로덕션 준비**: 82.6% 완성도, 95.4% 테스트 통과

---

## 📚 문서

| 문서 | 설명 |
|------|------|
| 📖 [**학습 가이드**](learning-guide.md) | 10단계 커리큘럼 (초급→고급) |
| 📚 [**API 레퍼런스**](api-reference.md) | 42개 표준 라이브러리 함수 |
| 🌍 [**언어 비교**](comparison.md) | Python, JavaScript, Go, Rust와 비교 |
| 📊 [**완성도 평가**](language-completeness.md) | 82.6% 종합 평가 |
| 📈 [**성능 벤치마크**](benchmarks.md) | 4,420 ops 측정 결과 |
| 🏗️ [**아키텍처**](architecture.md) | 시스템 설계 및 구현 |

---

## 🚀 빠른 시작

### 설치

```bash
git clone https://github.com/kimjindol2025/freelang-langv4.git
cd freelang-langv4
npm install && npm run build
```

### 첫 번째 프로그램

```freelang
let message = "Hello, FreeLang!"
println(message)

let numbers = [1, 2, 3, 4, 5]
for x in numbers {
  println(str(x * x))
}
```

### 실행

```bash
node dist/vm.js hello.fl
```

---

## 💡 주요 특징

### 1. 정적 타입 시스템
```freelang
let name: str = "Alice"
let age: i32 = 30
let scores: [i32] = [85, 90, 95]
```

### 2. 함수형 프로그래밍
```freelang
let doubled = numbers.fold([], fn(acc, x) -> {
  acc.push(x * 2)
  acc
})
```

### 3. 에러 처리
```freelang
match parse_int("42") {
  case Ok(num) -> println(str(num)),
  case Err(e) -> println(e)
}
```

### 4. 병렬 처리 & 분산 시스템
```freelang
let pool = worker_pool_new(4)
worker_pool_process(pool, task)
```

---

## 📊 성능 벤치마크

```
문자열 처리:      2,200 ops ⚡
컬렉션:            700 ops ⚡
수학 연산:         300 ops ⚡⚡⚡
함수 호출:          20 ops ✅
에러 처리:         300 ops ✅
구조체:            300 ops ✅
캐시 연산:         300 ops ✨ (신규)
메모리 할당:       300 ops ✨ (신규)
───────────────────────────────
합계:            4,420 ops (15.7% 개선)
```

---

## 🎓 학습 경로

| 단계 | 주제 | 시간 |
|------|------|------|
| 1-4 | **초급** (변수, 함수, 배열, 에러) | 8h |
| 5-7 | **중급** (함수형, 모듈, 메모리) | 6h |
| 8-10 | **고급** (병렬, 분산, 프로젝트) | 6h |

👉 [**10단계 학습 가이드 시작하기**](learning-guide.md)

---

## 🔧 기술 스택

- **언어**: FreeLang v4
- **컴파일러**: TypeScript (src/)
- **런타임**: Node.js VM
- **테스트**: Jest (95.4% 통과)
- **배포**: GitHub Pages + Gogs

---

## 📈 프로젝트 상태

```
Phase 1-3:  ✅ 완료  기초 구현
Phase 4-6:  ✅ 완료  성능 & 분산
Phase 7+:   🔄 진행중 고급 기능
```

| 메트릭 | 수치 |
|--------|------|
| **완성도** | 82.6% |
| **테스트** | 251/263 (95.4%) |
| **코드 라인** | 4,958줄 |
| **표준 함수** | 42개 |

---

## 🔗 링크

- 🐙 **GitHub**: https://github.com/kimjindol2025/freelang-langv4
- 📦 **Gogs**: https://gogs.dclub.kr/kim/freelang-v4
- 📖 **문서**: 이 페이지의 문서 섹션 참고

---

## 💬 피드백 & 기여

- 🐛 [버그 리포트](https://github.com/kimjindol2025/freelang-langv4/issues)
- 💡 [기능 제안](https://github.com/kimjindol2025/freelang-langv4/discussions)

---

## 📄 라이선스

MIT License - 자유롭게 사용하세요!

---

**Happy Coding! 🚀**

Last Updated: 2026-04-05
