# FundEye

一个基于 Electron + Vue 3 的桌面应用，用于实时追踪基金估值。

## 功能特性

- 基金搜索和添加到自选列表
- 实时估值更新（一分钟更新一次）
- 基金详情查看（包含前十大持仓）
- 按涨跌幅排序
- 支持 Windows / macOS / Linux

## 技术栈

- Electron 28
- Vue 3 + TypeScript
- Pinia 状态管理
- Element Plus UI
- Vite 构建

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev

# 测试基金代码

022365
```

## 打包发布

项目使用 GitHub Actions 自动打包发布。

### 一键发布

```bash
npm run release          # 自动 patch 版本: 1.0.0 -> 1.0.1
npm run release:minor    # minor 版本: 1.0.0 -> 1.1.0
npm run release:major    # major 版本: 1.0.0 -> 2.0.0
```

脚本会自动更新版本号、提交、创建 tag 并推送，GitHub Actions 随后自动打包并上传到 Releases。

### 本地打包

```bash
npm run build        # 打包当前平台
npm run build:win    # 仅打包 Windows
npm run build:mac    # 仅打包 macOS
```

## 其他命令

```bash
# 运行测试
npm run test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 开发小技巧

### 快捷键

| 快捷键                                      | 功能             |
| ------------------------------------------- | ---------------- |
| `Ctrl+Shift+I` (Win) / `Cmd+Option+I` (Mac) | 打开开发者控制台 |

### 代码规范

- 保存文件时自动格式化（需安装 Prettier 和 ESLint 扩展）
- Git commit 时自动检查代码风格（husky + lint-staged）

## 项目结构

```
├── electron/          # Electron 主进程入口
├── src/
│   ├── main/          # 主进程业务逻辑
│   │   ├── calculator/  # 估值计算
│   │   ├── fetchers/    # 数据抓取
│   │   └── services/    # 服务层
│   ├── renderer/      # Vue 渲染进程
│   │   ├── components/  # 组件
│   │   └── stores/      # Pinia 状态
│   └── shared/        # 共享类型定义
└── build/             # 打包资源（图标等）
```
