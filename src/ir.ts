// FreeLang v4 — IR (Intermediate Representation)
// Three-Address Code 형태의 중간 언어

// ============================================================
// IrValue — 피연산자
// ============================================================

export type IrValue =
  | { kind: "temp"; name: string }       // t0, t1, t2... (임시 변수)
  | { kind: "local"; name: string }      // 함수 로컬 변수
  | { kind: "global"; name: string }     // 글로벌 변수
  | { kind: "const_i32"; val: number }   // 정수 상수
  | { kind: "const_f64"; val: number }   // 실수 상수
  | { kind: "const_str"; val: string }   // 문자열 상수
  | { kind: "const_bool"; val: boolean }; // bool 상수

// ============================================================
// IrInst — 명령어 (Three-Address Code)
// ============================================================

export type IrInst =
  // 할당
  | { kind: "assign"; dest: string; src: IrValue }

  // 이항 연산
  | { kind: "binop"; dest: string; op: string; left: IrValue; right: IrValue }

  // 단항 연산
  | { kind: "unop"; dest: string; op: string; src: IrValue }

  // 제어 흐름
  | { kind: "label"; name: string }
  | { kind: "jump"; target: string }
  | { kind: "jump_if_false"; cond: IrValue; target: string }

  // 함수 호출
  | { kind: "call"; dest: string | null; fn: string; args: IrValue[] }
  | { kind: "call_builtin"; dest: string | null; name: string; args: IrValue[] }

  // 반환
  | { kind: "return"; value: IrValue | null }

  // 배열 연산
  | { kind: "array_new"; dest: string; elements: IrValue[] }
  | { kind: "array_get"; dest: string; arr: IrValue; idx: IrValue }
  | { kind: "array_set"; arr: IrValue; idx: IrValue; value: IrValue }

  // 구조체 연산
  | {
      kind: "struct_new";
      dest: string;
      sname: string;
      fields: { name: string; value: IrValue }[];
    }
  | { kind: "struct_get"; dest: string; obj: IrValue; field: string }
  | { kind: "struct_set"; obj: IrValue; field: string; value: IrValue }

  // Option/Result
  | { kind: "wrap_ok"; dest: string; value: IrValue }
  | { kind: "wrap_err"; dest: string; value: IrValue }
  | { kind: "unwrap"; dest: string; value: IrValue };

// ============================================================
// IrFunction — 함수 표현
// ============================================================

export type IrFunction = {
  name: string;
  params: string[]; // 매개변수명들
  insts: IrInst[]; // BasicBlock은 label/jump로 구분
};

// ============================================================
// IrProgram — 최상위 프로그램
// ============================================================

export type IrProgram = {
  functions: IrFunction[];
  main: IrInst[]; // 최상위 코드 (main 함수 외)
};
