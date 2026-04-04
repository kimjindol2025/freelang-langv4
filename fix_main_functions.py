import os

files = [
    'v9-optimized.fl',
    'v9-parallel.fl',
    'v9-memory.fl',
    'v9-memory-management.fl',
    'v9-agent-engine.fl',
    'v9-agent-ref-orchestrator.fl'
]

for filename in files:
    if not os.path.exists(filename):
        print(f"⚠️  {filename} 파일 없음")
        continue
    
    with open(filename, 'r') as f:
        content = f.read()
    
    # fn main() { → fn main() -> void {
    content = content.replace('fn main() {', 'fn main() -> void {')
    
    # 파일 끝에 main() 호출 추가 (이미 없다면)
    if not content.rstrip().endswith('main()'):
        content = content.rstrip() + '\n\nmain()\n'
    
    with open(filename, 'w') as f:
        f.write(content)
    
    print(f"✅ {filename} main() 수정 완료")

print("\n✅ 모든 파일의 main() 함수 수정 완료")
