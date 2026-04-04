import re
import os

def fix_struct_fields(content):
    # 모든 struct 블록에서 필드에 쉼마 추가
    pattern = r'(struct\s+\w+\s*\{[^}]*?\})'
    
    def process_struct(match):
        struct_text = match.group(1)
        lines = struct_text.split('\n')
        result = []
        
        for i, line in enumerate(lines):
            if line.strip() and not line.strip() == '}' and ':' in line:
                is_last_field = False
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    is_last_field = next_line == '}'
                
                if not line.rstrip().endswith(','):
                    if not is_last_field:
                        line = line.rstrip() + ','
            
            result.append(line)
        
        return '\n'.join(result)
    
    return re.sub(pattern, process_struct, content, flags=re.DOTALL)

# 처리할 파일들
files = [
    'v9-parallel.fl',
    'v9-memory.fl',
    'v9-memory-management.fl',
    'v9-agent-engine.fl',
    'v9-agent-ref-orchestrator.fl'
]

for filename in files:
    filepath = filename
    if not os.path.exists(filepath):
        print(f"⚠️  {filename} 파일 없음")
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # ;; → // 변경
    content = content.replace(';;', '//')
    
    # substring(s, i, i+1) → char_at(s, i) 변경
    content = re.sub(r'substring\(([^,]+),\s*([^,]+),\s*\2\s*\+\s*1\)', r'char_at(\1, \2)', content)
    
    # struct 필드 쉼마 추가
    content = fix_struct_fields(content)
    
    # f64 → i32 변경
    content = content.replace('f64', 'i32')
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✅ {filename} 수정 완료")

print("\n✅ 모든 Phase 5, 3 파일 수정 완료")
