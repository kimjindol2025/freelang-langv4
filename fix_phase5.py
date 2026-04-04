import re

def fix_struct_fields(content):
    # 패턴: struct로 시작해서 }로 끝나는 블록을 찾음
    pattern = r'(struct\s+\w+\s*\{[^}]*?\})'
    
    def process_struct(match):
        struct_text = match.group(1)
        lines = struct_text.split('\n')
        result = []
        
        for i, line in enumerate(lines):
            # 마지막 줄(}) 또는 빈 줄이 아닌 경우
            if line.strip() and not line.strip() == '}' and ':' in line:
                # 마지막 필드인지 확인 (다음 줄이 }인지)
                is_last_field = False
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    is_last_field = next_line == '}'
                
                # 이미 쉼마가 없다면 추가
                if not line.rstrip().endswith(','):
                    if not is_last_field:
                        line = line.rstrip() + ','
                
            result.append(line)
        
        return '\n'.join(result)
    
    return re.sub(pattern, process_struct, content, flags=re.DOTALL)

# 파일 읽기
with open('v9-optimized.fl', 'r') as f:
    content = f.read()

# 수정
content = fix_struct_fields(content)

# 파일 쓰기
with open('v9-optimized.fl', 'w') as f:
    f.write(content)

print("✅ struct 필드 쉼마 추가 완료")
