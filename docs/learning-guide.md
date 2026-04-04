# 📚 FreeLang v4 - 10단계 학습 가이드

**총 학습 시간: 20시간**
- 초급: 8시간 (Step 1-4)
- 중급: 6시간 (Step 5-7)
- 고급: 6시간 (Step 8-10)

---

## 🎯 학습 목표

| Step | 제목 | 난이도 | 시간 | 목표 |
|------|------|--------|------|------|
| 1 | 언어 기초 | ⭐ | 2h | 변수, 타입 이해 |
| 2 | 함수와 제어 흐름 | ⭐ | 2h | 로직 구성 |
| 3 | 배열과 구조체 | ⭐⭐ | 2h | 데이터 구조 |
| 4 | 에러 처리 | ⭐⭐ | 2h | 안정성 |
| 5 | 함수형 프로그래밍 | ⭐⭐ | 2h | 고급 기법 |
| 6 | 모듈과 임포트 | ⭐⭐ | 2h | 코드 구조화 |
| 7 | 메모리 관리 | ⭐⭐⭐ | 2h | 성능 최적화 |
| 8 | 병렬 처리 | ⭐⭐⭐ | 2h | 동시성 |
| 9 | 분산 시스템 | ⭐⭐⭐⭐ | 2h | 확장성 |
| 10 | 실전 프로젝트 | ⭐⭐⭐⭐ | 2h | 종합 응용 |

---

## 📖 Step 1: 언어 기초 (2시간)

### 학습 내용
- 변수 선언과 타입
- 기본 데이터 타입
- 입출력 (println)

### 코드 샘플

```freelang
// 변수 선언
let name = "Alice"
let age = 30
let score = 95.5
let active = true

// 타입 명시
let x: i32 = 42
let message: str = "Hello"
let values: [i32] = [1, 2, 3]

// 출력
println(name)
println(str(age))
println(str(score))
```

### 실습 과제

**과제 1**: 개인 정보 출력
```freelang
// name, age, email, phone을 변수로 선언하고 출력하세요
```

**과제 2**: 타입 변환
```freelang
let num_str = "42"
// 문자열을 숫자로 변환해서 제곱을 계산하세요
```

### 검증

```bash
node dist/vm.js step1-practice.fl
```

---

## 📖 Step 2: 함수와 제어 흐름 (2시간)

### 학습 내용
- 함수 정의와 호출
- if/else 조건문
- while/for 반복문

### 코드 샘플

```freelang
// 함수 정의
fn greet(name: str) -> str {
  "Hello, " + name
}

fn add(a: i32, b: i32) -> i32 {
  a + b
}

fn factorial(n: i32) -> i32 {
  if n <= 1 {
    1
  } else {
    n * factorial(n - 1)
  }
}

// 반복문
fn sum_range(start: i32, end: i32) -> i32 {
  let sum = 0
  let i = start
  while i <= end {
    sum = sum + i
    i = i + 1
  }
  sum
}

fn print_numbers(n: i32) -> void {
  for i in range(1, n) {
    println(str(i))
  }
}
```

### 실습 과제

**과제 1**: 간단한 함수
```freelang
// 두 수를 입력받아 큰 수를 반환하는 max() 함수 작성
```

**과제 2**: 반복 계산
```freelang
// 1부터 n까지의 합을 계산하는 함수 작성
```

**과제 3**: 조건 분기
```freelang
// 성적을 입력받아 학점을 반환하는 함수 작성
// 90-100: A, 80-89: B, 70-79: C
```

---

## 📖 Step 3: 배열과 구조체 (2시간)

### 학습 내용
- 배열 선언과 조작
- 배열 메서드
- 구조체 정의와 사용

### 코드 샘플

```freelang
// 배열
let numbers = [1, 2, 3, 4, 5]
numbers.push(6)
let first = numbers[0]
let length = numbers.length()

// 배열 순회
for num in numbers {
  println(str(num))
}

// 구조체
struct Person {
  name: str,
  age: i32,
  email: str
}

let alice = Person("Alice", 30, "alice@example.com")
println(alice.name)
println(str(alice.age))

// 구조체 배열
let people = [
  Person("Alice", 30, "alice@example.com"),
  Person("Bob", 25, "bob@example.com"),
  Person("Charlie", 35, "charlie@example.com")
]

for person in people {
  println(person.name)
}
```

### 실습 과제

**과제 1**: 학생 정보 관리
```freelang
struct Student {
  name: str,
  grade: i32,
  score: i32
}

// 학생 3명을 배열에 저장하고 평균 점수 계산
```

**과제 2**: 배열 필터링
```freelang
// 숫자 배열에서 10보다 큰 수만 출력
```

---

## 📖 Step 4: 에러 처리 (2시간)

### 학습 내용
- Result와 Option 타입
- match 표현식
- 에러 전파

### 코드 샘플

```freelang
// Option 타입
fn find_user(users: [str], name: str) -> Option(i32) {
  for i in range(0, users.length()) {
    if users[i] == name {
      return Some(i)
    }
  }
  None
}

// Result 타입
fn parse_age(age_str: str) -> Result(i32, str) {
  match parse_int(age_str) {
    case Ok(age) -> {
      if age >= 0 && age <= 150 {
        Ok(age)
      } else {
        Err("Age out of range")
      }
    },
    case Err(e) -> Err(e)
  }
}

// match 패턴 매칭
fn process_age(age_str: str) -> void {
  match parse_age(age_str) {
    case Ok(age) -> {
      println("Valid age: " + str(age))
    },
    case Err(error) -> {
      println("Error: " + error)
    }
  }
}
```

### 실습 과제

**과제 1**: 사용자 검색
```freelang
// 사용자 목록에서 특정 사용자를 찾는 함수 (Option 반환)
```

**과제 2**: 입력 검증
```freelang
// 이메일 형식을 검증하는 함수 (Result 반환)
```

---

## 📖 Step 5: 함수형 프로그래밍 (2시간)

### 학습 내용
- 고차 함수 (Higher-order functions)
- 클로저와 람다
- fold, map, filter

### 코드 샘플

```freelang
// 고차 함수
fn apply_twice(fn: fn(i32) -> i32, x: i32) -> i32 {
  fn(fn(x))
}

fn add_n(n: i32) -> fn(i32) -> i32 {
  fn(x) -> x + n
}

// 클로저
let add_five = fn(x) -> x + 5
let result = add_five(10)  // 15

// fold - 축약
let numbers = [1, 2, 3, 4, 5]
let sum = numbers.fold(0, fn(acc, x) -> acc + x)
let product = numbers.fold(1, fn(acc, x) -> acc * x)

// map - 변환
let doubled = numbers.fold([], fn(acc, x) -> {
  acc.push(x * 2)
  acc
})

// filter - 필터링
let evens = numbers.fold([], fn(acc, x) -> {
  if x % 2 == 0 {
    acc.push(x)
    acc
  } else {
    acc
  }
})
```

### 실습 과제

**과제 1**: 숫자 변환
```freelang
// [1, 2, 3, 4, 5]를 fold를 사용해 제곱의 합 계산
```

**과제 2**: 데이터 필터링
```freelang
// 학생 배열에서 점수 80점 이상만 추출
```

---

## 📖 Step 6: 모듈과 임포트 (2시간)

### 학습 내용
- 모듈 구조
- import/export
- 네임스페이스

### 코드 샘플

```freelang
// math_utils.fl
export fn add(a: i32, b: i32) -> i32 {
  a + b
}

export fn multiply(a: i32, b: i32) -> i32 {
  a * b
}

// main.fl
import math_utils

fn main() -> void {
  let result = math_utils.add(5, 3)
  println(str(result))
}
```

### 실습 과제

**과제 1**: 유틸리티 모듈
```freelang
// string_utils.fl 모듈 작성
// capitalize, to_upper, to_lower 함수 포함
```

---

## 📖 Step 7: 메모리 관리 (2시간)

### 학습 내용
- 메모리 할당과 해제
- 가비지 컬렉션
- 메모리 최적화

### 코드 샘플

```freelang
// 메모리 사용
fn process_data(size: i32) -> i32 {
  let data = []
  for i in range(0, size) {
    data.push(i)
  }
  // 함수 종료 시 자동으로 메모리 해제
  data.length()
}

// 메모리 풀
struct MemoryPool {
  free_blocks: [MemoryBlock],
  allocated: [MemoryBlock]
}

fn allocate(pool: MemoryPool, size: i32) -> MemoryBlock {
  // 재사용 가능한 블록 찾기
  match pool.free_blocks.pop() {
    case Some(block) -> block,
    case None -> MemoryBlock(size, false)
  }
}
```

### 실습 과제

**과제 1**: 메모리 추적
```freelang
// 대규모 배열 생성/삭제 시뮬레이션
```

---

## 📖 Step 8: 병렬 처리 (2시간)

### 학습 내용
- WorkerPool
- 작업 분산
- 결과 수집

### 코드 샘플

```freelang
// 워커 풀
struct WorkerPool {
  workers: [WorkerThread],
  task_queue: [Task]
}

fn worker_pool_new(size: i32) -> WorkerPool {
  let workers = []
  for i in range(0, size) {
    workers.push(WorkerThread(i, TaskQueue()))
  }
  WorkerPool(workers, [])
}

fn worker_pool_process(pool: WorkerPool, task: Task) -> Result {
  // 작업을 워커에 할당
  let worker = pool.workers[task.id % pool.workers.length()]
  worker.enqueue(task)
  Ok("Task submitted")
}

// 병렬 계산
fn parallel_sum(numbers: [i32], worker_count: i32) -> i32 {
  let pool = worker_pool_new(worker_count)
  let chunk_size = numbers.length() / worker_count
  let results = []

  for i in range(0, worker_count) {
    let start = i * chunk_size
    let end = if i == worker_count - 1 {
      numbers.length()
    } else {
      (i + 1) * chunk_size
    }
    // 작업 분산
  }

  // 결과 수집
  0
}
```

### 실습 과제

**과제 1**: 병렬 데이터 처리
```freelang
// 대규모 배열을 4개 워커로 병렬 처리
```

---

## 📖 Step 9: 분산 시스템 (2시간)

### 학습 내용
- 클러스터 관리
- 작업 분산
- 장애 조치

### 코드 샘플

```freelang
// 노드
struct Node {
  id: str,
  addr: str,
  status: str,
  load: i32
}

// 클러스터
struct Cluster {
  name: str,
  nodes: [Node],
  leader_id: str,
  mode: str
}

fn cluster_new(name: str) -> Cluster {
  Cluster(name, [], "", "standby")
}

fn cluster_add_node(cluster: Cluster, node: Node) -> Cluster {
  cluster.nodes.push(node)
  cluster
}

fn cluster_dispatch(cluster: Cluster, task: DistributedTask) -> TaskResult {
  let node = cluster.nodes[task.id % cluster.nodes.length()]
  // 라운드로빈 분산
  TaskResult(task.id, node.id, "success", 10)
}

fn cluster_failover(cluster: Cluster, failed_node_id: str) -> Cluster {
  // 장애 노드 제거 및 재조정
  cluster
}
```

### 실습 과제

**과제 1**: 분산 작업 시뮬레이션
```freelang
// 10개 작업을 3개 노드로 분산 처리
// 한 노드가 실패했을 때 동작 확인
```

---

## 📖 Step 10: 실전 프로젝트 (2시간)

### 프로젝트 요구사항

**프로젝트: 간단한 Task Management 시스템**

```freelang
struct Task {
  id: str,
  title: str,
  description: str,
  status: str,
  assignee: str,
  priority: i32
}

struct TaskManager {
  tasks: [Task],
  users: [str]
}

fn task_manager_new() -> TaskManager {
  TaskManager([], [])
}

fn create_task(manager: TaskManager, title: str, desc: str) -> Result {
  let task = Task(
    "task_" + str(manager.tasks.length()),
    title,
    desc,
    "todo",
    "",
    3
  )
  manager.tasks.push(task)
  Ok("Task created")
}

fn assign_task(manager: TaskManager, task_id: str, assignee: str) -> Result {
  // 작업을 사용자에게 할당
  Ok("Task assigned")
}

fn update_status(manager: TaskManager, task_id: str, status: str) -> Result {
  // 작업 상태 업데이트 (todo -> in_progress -> done)
  Ok("Status updated")
}

fn list_tasks(manager: TaskManager) -> [Task] {
  manager.tasks
}

fn get_user_tasks(manager: TaskManager, user: str) -> [Task] {
  // 사용자의 모든 작업 반환
  []
}
```

### 요구사항 체크리스트

- [ ] 구조체 정의 (Task, TaskManager)
- [ ] 함수 8개 이상 구현
- [ ] 에러 처리 (Result 사용)
- [ ] 배열 조작
- [ ] 반복문 활용
- [ ] 테스트 코드 작성

### 평가 기준

| 항목 | 만점 |
|------|------|
| 코드 정확성 | 40점 |
| 에러 처리 | 20점 |
| 코드 가독성 | 20점 |
| 테스트 커버리지 | 20점 |

---

## 🎓 학습 팁

### 효과적인 학습 방법

1. **단계별 학습**
   - 각 단계마다 코드 샘플 먼저 읽기
   - 샘플을 직접 입력하고 실행해보기
   - 작은 수정을 가해보기

2. **실습 과제**
   - 과제를 완료한 후 다음 단계로 진행
   - 한 단계에 최소 1시간 이상 투자
   - 막히면 샘플 코드를 다시 참고

3. **프로젝트**
   - Step 10은 모든 개념을 종합
   - 실패를 두려워하지 말기
   - 완벽한 코드보다 동작하는 코드 우선

### 학습 자료

- 📖 [API 레퍼런스](api-reference.md)
- 📊 [언어 완성도](language-completeness.md)
- 📈 [성능 벤치마크](benchmarks.md)
- 🏗️ [아키텍처](architecture.md)

---

## 🏆 다음 단계

### 초급 완료 후
- [x] Step 1-4 완료
- [ ] 다른 학습자와 코드 공유
- [ ] 간단한 유틸리티 프로그램 작성

### 중급 완료 후
- [x] Step 5-7 완료
- [ ] 오픈소스 프로젝트 참여
- [ ] 성능 최적화 연구

### 고급 완료 후
- [x] Step 8-10 완료
- [ ] 새로운 라이브러리 개발
- [ ] 커뮤니티에 기여

---

**Happy Learning! 🚀**

Last Updated: 2026-04-05
