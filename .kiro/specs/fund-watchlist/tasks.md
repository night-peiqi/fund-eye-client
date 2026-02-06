·123# Implementation Plan: 基金自选客户端

## Overview

基于 Electron + Vue 3 + TypeScript 架构，分阶段实现基金自选客户端。从项目脚手架搭建开始，逐步实现数据抓取、估值计算、状态管理和 UI 组件，最后完成跨平台打包。

## Tasks

- [x] 1. 项目初始化与基础架构
  - [x] 1.1 创建 Electron + Vue 3 + TypeScript 项目脚手架
    - 使用 Vite 创建 Vue 3 项目
    - 集成 Electron 和 electron-builder
    - 配置 TypeScript 和路径别名
    - _Requirements: 5.1, 5.2_
  - [x] 1.2 定义核心类型和接口
    - 创建 Fund、Holding、StockQuote 等类型定义
    - 定义 IPC 通信通道常量
    - _Requirements: 3.2, 3.4_
  - [ ] 1.3 配置测试环境
    - 安装 Vitest 和 fast-check
    - 配置测试脚本和覆盖率报告
    - _Requirements: 所有属性测试依赖_

- [x] 2. 数据抓取模块
  - [x] 2.1 实现天天基金网数据抓取
    - 实现基金搜索接口（根据代码查询基金信息）
    - 实现基金详情抓取（获取前十大持仓）
    - 处理 HTML 解析和数据提取
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 2.2 实现东方财富网股票行情抓取
    - 实现批量获取股票实时行情接口
    - 解析股票价格、涨跌幅数据
    - _Requirements: 6.4, 6.5_
  - [ ]\* 2.3 编写数据抓取单元测试
    - 使用 mock 数据测试解析逻辑
    - 测试错误处理和边界情况
    - _Requirements: 6.6, 6.7_

- [-] 3. 估值计算模块
  - [x] 3.1 实现估值计算器
    - 实现加权涨跌幅计算：Σ(股票涨跌幅 × 持仓占比)
    - 实现估值净值计算：昨日净值 × (1 + 估值涨跌幅)
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]\* 3.2 编写估值计算属性测试
    - **Property 1: 估值计算正确性**
    - **Validates: Requirements 2.2, 7.1, 7.2**
  - [ ]\* 3.3 编写估值净值属性测试
    - **Property 2: 估值净值计算正确性**
    - **Validates: Requirements 7.3**

- [x] 4. Checkpoint - 核心计算逻辑验证
  - Ensure all tests pass, ask the user if questions arise.

- [-] 5. 本地存储模块
  - [x] 5.1 实现 electron-store 存储服务
    - 实现自选列表的保存和加载
    - 处理数据版本迁移
    - _Requirements: 4.1, 4.2_
  - [ ]\* 5.2 编写存储 Round-Trip 属性测试
    - **Property 6: 持久化 Round-Trip**
    - **Validates: Requirements 4.1, 4.2**
  - [ ]\* 5.3 编写存储错误处理测试
    - 测试数据损坏时的恢复逻辑
    - _Requirements: 4.3_

- [-] 6. 状态管理（Pinia Store）
  - [x] 6.1 实现 watchlist store
    - 实现基金添加、删除、更新操作
    - 实现去重逻辑
    - 实现排序功能
    - _Requirements: 1.3, 1.4, 3.5, 3.6_
  - [ ]\* 6.2 编写自选列表添加属性测试
    - **Property 3: 自选列表添加不变性**
    - **Validates: Requirements 1.3**
  - [ ]\* 6.3 编写自选列表去重属性测试
    - **Property 4: 自选列表去重**
    - **Validates: Requirements 1.4**
  - [ ]\* 6.4 编写自选列表删除属性测试
    - **Property 5: 自选列表删除不变性**
    - **Validates: Requirements 3.5**
  - [ ]\* 6.5 编写排序属性测试
    - **Property 7: 涨跌幅排序正确性**
    - **Validates: Requirements 3.6**

- [x] 7. Checkpoint - 状态管理验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. 主进程服务
  - [x] 8.1 实现 IPC 处理器
    - 注册基金搜索、添加、删除的 IPC 处理
    - 注册估值更新的 IPC 处理
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 8.2 实现定时更新调度器
    - 实现 5 秒间隔的自动更新逻辑
    - 实现手动刷新触发
    - _Requirements: 2.1, 2.6_
  - [x] 8.3 实现错误处理和重试机制
    - 网络错误时显示状态提示
    - 自动重试逻辑
    - _Requirements: 2.5, 6.7_

- [x] 9. UI 组件开发
  - [x] 9.1 实现搜索组件
    - 基金代码输入框
    - 搜索结果展示和确认添加
    - _Requirements: 1.1, 1.2, 1.5_
  - [x] 9.2 实现自选列表组件
    - 基金列表展示（代码、名称、估值、涨跌幅、时间）
    - 涨跌颜色显示（红涨绿跌）
    - 排序切换
    - _Requirements: 3.1, 3.2, 2.4, 3.6_
  - [x] 9.3 实现基金详情组件
    - 基金基本信息展示
    - 前十大持仓列表
    - 删除基金功能
    - _Requirements: 3.3, 3.4, 3.5_
  - [x] 9.4 实现状态提示组件
    - 网络状态指示
    - 更新时间显示
    - 估值说明文案
    - _Requirements: 2.3, 2.5, 7.4_
  - [ ]\* 9.5 编写涨跌颜色映射属性测试
    - **Property 8: 涨跌颜色映射**
    - **Validates: Requirements 2.4**
  - [ ]\* 9.6 编写基金信息展示属性测试
    - **Property 9: 基金信息展示完整性**
    - **Validates: Requirements 3.2**
  - [ ]\* 9.7 编写持仓信息展示属性测试
    - **Property 10: 持仓信息展示完整性**
    - **Validates: Requirements 3.4**

- [x] 10. Checkpoint - UI 组件验证
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. 集成与打包
  - [x] 11.1 组件集成和布局
    - 整合所有组件到主界面
    - 实现响应式布局适配
    - _Requirements: 5.4_
  - [x] 11.2 配置 electron-builder 打包
    - 配置 Windows 打包（exe/msi）
    - 配置 macOS 打包（dmg）
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]\* 11.3 编写集成测试
    - 测试完整的添加-更新-删除流程
    - _Requirements: 1.3, 2.1, 3.5_

- [ ] 12. Final Checkpoint - 完整功能验证
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 属性测试使用 fast-check 库，每个测试运行 100 次迭代
- 数据抓取在主进程中执行以避免跨域问题
- 建议先完成核心计算和存储逻辑，再开发 UI
