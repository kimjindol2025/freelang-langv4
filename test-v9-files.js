#!/usr/bin/env node

/**
 * v9 파일 테스트 스크립트
 * Phase 4-6 v9 파일들을 실행하고 결과를 검증
 */

const fs = require('fs');
const path = require('path');
const { Lexer } = require('./dist/lexer');
const { Parser } = require('./dist/parser');
const { Compiler } = require('./dist/compiler');
const { VM } = require('./dist/vm');

const V9_FILES = [
  'v9-memory.fl',
  'v9-parallel.fl',
  'v9-agent-engine.fl',
  'v9-memory-management.fl',
  'v9-distributed.fl',
  'v9-benchmark.fl'
];

async function execFile(filePath) {
  try {
    const source = fs.readFileSync(filePath, 'utf-8');

    // Lexer
    const { tokens, errors: lexErrors } = new Lexer(source).tokenize();
    if (lexErrors.length > 0) {
      throw new Error(`Lex: ${lexErrors.map(e => e.message).join(', ')}`);
    }

    // Parser
    const { program, errors: parseErrors } = new Parser(tokens).parse();
    if (parseErrors.length > 0) {
      throw new Error(`Parse: ${parseErrors.map(e => e.message).join(', ')}`);
    }

    // Compiler
    const chunk = new Compiler().compile(program);

    // VM
    const { output } = await new VM().run(chunk);

    return {
      status: 'PASSED',
      output: output.join('\n')
    };
  } catch (error) {
    return {
      status: 'FAILED',
      error: error.message
    };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  v9 파일 테스트 실행                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const file of V9_FILES) {
    const filePath = path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  ${file}: 파일 없음`);
      results.push({ file, status: 'SKIPPED' });
      continue;
    }

    process.stdout.write(`테스트 중: ${file}... `);
    const result = await execFile(filePath);

    if (result.status === 'PASSED') {
      console.log('✅ PASSED');
      passed++;
      results.push({ file, status: 'PASSED' });
    } else {
      console.log('❌ FAILED');
      console.log(`  → ${result.error}`);
      failed++;
      results.push({ file, status: 'FAILED', error: result.error });
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log('📊 테스트 결과 요약');
  console.log('═'.repeat(50));

  for (const result of results) {
    const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⏭️ ';
    console.log(`${icon} ${result.file.padEnd(30)} ${result.status}`);
  }

  console.log('─'.repeat(50));
  console.log(`📈 합계: ${passed} 통과, ${failed} 실패`);
  console.log('');

  if (failed === 0) {
    console.log('✅ 모든 v9 파일이 성공적으로 실행되었습니다!');
    process.exit(0);
  } else {
    console.log(`❌ ${failed}개 파일에서 문제가 발생했습니다.`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('치명적 오류:', error.message);
  process.exit(1);
});
