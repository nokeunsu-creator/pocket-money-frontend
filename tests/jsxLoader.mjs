// node에서 .jsx를 직접 import할 수 있게 하는 ESM 로더 (esbuild로 변환)
// smokeRender.register.mjs가 register()로 등록해서 쓴다.
//
// Vite와 맞춰야 하는 두 가지:
//  1) 확장자 생략 import — Vite는 '../utils/sounds' → sounds.js 로 해석하지만 node는 못 찾는다
//  2) import.meta.env — Vite 전용이라 node에는 없다. 스텁 객체로 치환한다

import { readFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { transform } from 'esbuild'

const EXTS = ['.js', '.jsx', '.mjs', '.json']

export async function resolve(specifier, context, nextResolve) {
  // 상대 경로인데 확장자가 없으면 Vite처럼 확장자를 붙여 본다
  if (specifier.startsWith('.') && !/\.(js|jsx|mjs|cjs|json|css|png|svg)$/.test(specifier)) {
    const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd()
    const base = new URL(specifier, new URL('file://' + parentPath.replace(/\\/g, '/')))
    const basePath = fileURLToPath(base)
    for (const ext of EXTS) {
      if (existsSync(basePath + ext)) {
        return nextResolve(specifier + ext, context)
      }
    }
    // 디렉터리면 index 파일을 찾는다
    if (existsSync(basePath) && statSync(basePath).isDirectory()) {
      for (const ext of EXTS) {
        if (existsSync(basePath + '/index' + ext)) {
          return nextResolve(specifier + '/index' + ext, context)
        }
      }
    }
  }
  return nextResolve(specifier, context)
}

async function transformSource(url, loader) {
  const source = await readFile(fileURLToPath(url), 'utf8')
  const { code } = await transform(source, {
    loader,
    format: 'esm',
    target: 'node20',
    // classic 모드는 React를 전역에서 찾아 'React is not defined'가 난다
    jsx: 'automatic',
    sourcefile: fileURLToPath(url),
    define: { 'import.meta.env': '__VITE_ENV__' },
  })
  return {
    format: 'module',
    shortCircuit: true,
    source: `const __VITE_ENV__ = globalThis.__VITE_ENV__ || {};\n${code}`,
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.jsx')) return transformSource(url, 'jsx')

  // .js 안에서도 import.meta.env를 쓰는 파일이 있다 (config/names.js, api/api.js)
  if (url.endsWith('.js') && !url.includes('node_modules')) {
    const source = await readFile(fileURLToPath(url), 'utf8')
    if (source.includes('import.meta.env')) return transformSource(url, 'js')
  }
  return nextLoad(url, context)
}
