#!/usr/bin/env node
/**
 * 发布脚本 - 自动创建 tag 并推送触发 GitHub Actions 打包
 *
 * 用法:
 *   node scripts/release.js patch   # 1.0.0 -> 1.0.1
 *   node scripts/release.js minor   # 1.0.0 -> 1.1.0
 *   node scripts/release.js major   # 1.0.0 -> 2.0.0
 *   node scripts/release.js 1.2.3   # 指定版本号
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import process from 'process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

function exec(cmd, options = {}) {
  console.log(`> ${cmd}`)
  return execSync(cmd, { cwd: rootDir, stdio: 'inherit', ...options })
}

function execOutput(cmd) {
  return execSync(cmd, { cwd: rootDir, encoding: 'utf-8' }).trim()
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number)
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    default:
      if (/^\d+\.\d+\.\d+$/.test(type)) return type
      throw new Error(`无效的版本类型: ${type}`)
  }
}

/**
 * 生成 changelog - 从上一个 tag 到现在的 commit
 */
function generateChangelog() {
  // 获取最新的 tag
  let lastTag = ''
  try {
    lastTag = execOutput('git describe --tags --abbrev=0')
  } catch {
    // 没有 tag，获取所有 commit
  }

  // 获取 commit 列表
  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD'
  let commits = ''
  try {
    commits = execOutput(`git log ${range} --pretty=format:"%s" --no-merges`)
  } catch {
    return ''
  }

  if (!commits) return ''

  // 分类 commit
  const features = []
  const fixes = []
  const others = []

  commits.split('\n').forEach((msg) => {
    if (!msg) return
    // 跳过 release commit
    if (msg.startsWith('chore: release')) return

    if (msg.startsWith('feat:') || msg.startsWith('feat(')) {
      features.push(msg.replace(/^feat(\([^)]+\))?:\s*/, ''))
    } else if (msg.startsWith('fix:') || msg.startsWith('fix(')) {
      fixes.push(msg.replace(/^fix(\([^)]+\))?:\s*/, ''))
    } else if (!msg.startsWith('chore:') && !msg.startsWith('docs:') && !msg.startsWith('style:')) {
      others.push(msg)
    }
  })

  // 生成 markdown
  let changelog = ''

  if (features.length > 0) {
    changelog += '### ✨ 新功能\n'
    features.forEach((f) => (changelog += `- ${f}\n`))
    changelog += '\n'
  }

  if (fixes.length > 0) {
    changelog += '### 🐛 修复\n'
    fixes.forEach((f) => (changelog += `- ${f}\n`))
    changelog += '\n'
  }

  if (others.length > 0) {
    changelog += '### 📦 其他\n'
    others.forEach((o) => (changelog += `- ${o}\n`))
    changelog += '\n'
  }

  return changelog.trim()
}

async function main() {
  const versionType = process.argv[2] || 'patch'

  // 检查工作区是否干净
  try {
    const status = execOutput('git status --porcelain')
    if (status) {
      console.error('错误: 工作区有未提交的更改，请先提交或暂存')
      process.exit(1)
    }
  } catch {
    console.error('错误: 无法获取 git 状态')
    process.exit(1)
  }

  // 读取当前版本
  const pkgPath = resolve(rootDir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const currentVersion = pkg.version
  const newVersion = bumpVersion(currentVersion, versionType)

  console.log(`\n版本更新: ${currentVersion} -> ${newVersion}\n`)

  // 检查 tag 是否已存在
  try {
    execOutput(`git rev-parse v${newVersion}`)
    console.error(`错误: tag v${newVersion} 已存在，请使用其他版本号`)
    process.exit(1)
  } catch {
    // tag 不存在，继续
  }

  // 生成 changelog
  const changelog = generateChangelog()
  console.log('生成的 Changelog:')
  console.log(changelog || '(无更新内容)')
  console.log('')

  // 更新 CHANGELOG.md
  const changelogPath = resolve(rootDir, 'CHANGELOG.md')
  const date = new Date().toISOString().split('T')[0]
  const newEntry = `## v${newVersion} (${date})\n\n${changelog || '- 常规更新'}\n\n`

  let existingChangelog = ''
  try {
    existingChangelog = readFileSync(changelogPath, 'utf-8')
  } catch {
    existingChangelog = '# Changelog\n\n'
  }

  // 在标题后插入新版本记录
  const headerEnd = existingChangelog.indexOf('\n\n') + 2
  const updatedChangelog =
    existingChangelog.slice(0, headerEnd) + newEntry + existingChangelog.slice(headerEnd)
  writeFileSync(changelogPath, updatedChangelog)

  // 更新 package.json
  pkg.version = newVersion
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  // 提交版本更新
  exec('git add package.json CHANGELOG.md')
  exec(`git commit -m "chore: release v${newVersion}"`)

  // 创建带 changelog 的 tag
  const tagMessage = changelog ? `Release v${newVersion}\n\n${changelog}` : `Release v${newVersion}`
  // 写入临时文件避免命令行转义问题
  const tagMsgFile = resolve(rootDir, '.tag-message.tmp')
  writeFileSync(tagMsgFile, tagMessage)
  exec(`git tag -a v${newVersion} -F "${tagMsgFile}"`)
  // 删除临时文件
  try {
    execSync(`del "${tagMsgFile}"`, { cwd: rootDir, stdio: 'ignore', shell: true })
  } catch {
    // ignore
  }

  // 推送
  exec('git push')
  exec('git push --tags')

  console.log(`\n✅ 发布成功! v${newVersion}`)
  console.log('GitHub Actions 将自动开始打包，请查看:')
  console.log('https://github.com/night-peiqi/fund-eye-client/actions\n')
}

main().catch((err) => {
  console.error('发布失败:', err.message)
  process.exit(1)
})
