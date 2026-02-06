# Requirements Document

## Introduction

基金自选客户端是一款跨平台桌面应用，帮助用户管理和追踪自选基金的实时估值。用户可以通过基金代码搜索添加基金到自选列表，系统每5秒自动更新基金估值数据，让用户及时掌握基金涨跌情况。

## Glossary

- **Fund_Watchlist_App**: 基金自选客户端应用程序
- **Fund**: 基金实体，包含基金代码、名称、估值等信息
- **Watchlist**: 用户的自选基金列表
- **Valuation**: 基金估值，包含净值、涨跌幅等数据
- **Data_Fetcher**: 数据抓取模块，负责从天天基金网获取数据
- **Search_Engine**: 搜索引擎，负责根据基金代码查询基金信息
- **Top_Holdings**: 前十大持仓，基金持有的前十大股票及其占比
- **Valuation_Calculator**: 估值计算器，根据持仓股票实时价格计算基金估值

## Requirements

### Requirement 1: 基金搜索与添加

**User Story:** 作为用户，我想通过基金代码搜索并添加基金到自选列表，以便追踪我关注的基金。

#### Acceptance Criteria

1. WHEN 用户输入基金代码并提交搜索 THEN THE Search_Engine SHALL 从天天基金网查询匹配的基金信息
2. WHEN 搜索返回有效基金结果 THEN THE Fund_Watchlist_App SHALL 显示基金名称、代码和当前估值供用户确认
3. WHEN 用户确认添加基金 THEN THE Watchlist SHALL 将该基金添加到自选列表并持久化存储
4. WHEN 用户尝试添加已存在于自选列表的基金 THEN THE Fund_Watchlist_App SHALL 提示用户该基金已在自选列表中
5. IF 搜索的基金代码不存在 THEN THE Fund_Watchlist_App SHALL 显示"未找到该基金"的错误提示

### Requirement 2: 实时估值计算与更新

**User Story:** 作为用户，我想自动获取自选基金的实时估值更新，以便及时了解基金涨跌情况。

#### Acceptance Criteria

1. WHILE Fund_Watchlist_App 处于运行状态 THEN THE Valuation_Calculator SHALL 每5秒根据持仓股票实时价格计算所有自选基金的估值
2. WHEN 计算基金估值 THEN THE Valuation_Calculator SHALL 获取前十大持仓股票的实时涨跌幅，按持仓占比加权计算基金估值涨跌幅
3. WHEN 估值数据更新成功 THEN THE Fund_Watchlist_App SHALL 刷新界面显示最新的估值和涨跌幅
4. WHEN 估值数据相比上次有变化 THEN THE Fund_Watchlist_App SHALL 通过颜色变化（红涨绿跌）提示用户
5. IF 网络连接中断或股票数据获取失败 THEN THE Fund_Watchlist_App SHALL 显示连接状态提示并在恢复后自动重试
6. WHEN 用户手动触发刷新 THEN THE Valuation_Calculator SHALL 立即重新计算最新估值数据

### Requirement 3: 自选列表展示

**User Story:** 作为用户，我想查看自选基金列表的详细信息，以便快速了解所有关注基金的状态。

#### Acceptance Criteria

1. THE Fund_Watchlist_App SHALL 以列表形式展示所有自选基金
2. WHEN 展示基金信息 THEN THE Fund_Watchlist_App SHALL 显示以下字段：基金代码、基金名称、最新估值、今日涨跌幅、估值时间
3. WHEN 用户点击列表中的基金 THEN THE Fund_Watchlist_App SHALL 展示该基金的详细信息，包括前十大持仓
4. WHEN 展示基金详情 THEN THE Fund_Watchlist_App SHALL 显示前十大持仓股票的名称、代码、持仓占比和当日涨跌幅
5. WHEN 用户选择删除基金 THEN THE Watchlist SHALL 从自选列表中移除该基金并更新持久化存储
6. THE Fund_Watchlist_App SHALL 支持按涨跌幅排序自选列表

### Requirement 4: 数据持久化

**User Story:** 作为用户，我想让自选列表在应用重启后保持不变，以便不需要重复添加基金。

#### Acceptance Criteria

1. WHEN 用户添加或删除自选基金 THEN THE Fund_Watchlist_App SHALL 立即将变更保存到本地存储
2. WHEN 应用启动 THEN THE Fund_Watchlist_App SHALL 从本地存储加载之前保存的自选列表
3. IF 本地存储数据损坏或不可读 THEN THE Fund_Watchlist_App SHALL 初始化空的自选列表并提示用户

### Requirement 5: 跨平台支持

**User Story:** 作为用户，我想在 Windows 和 Mac 上使用相同的应用，以便在不同设备上管理自选基金。

#### Acceptance Criteria

1. THE Fund_Watchlist_App SHALL 支持 Windows 10+ 操作系统
2. THE Fund_Watchlist_App SHALL 支持 macOS 10.15+ 操作系统
3. THE Fund_Watchlist_App SHALL 在不同平台上提供一致的用户界面和功能
4. THE Fund_Watchlist_App SHALL 适配桌面端和移动端的不同屏幕尺寸

### Requirement 6: 数据抓取

**User Story:** 作为系统，我需要从多个数据源获取基金和股票数据，以便为用户提供准确的估值信息。

#### Acceptance Criteria

1. THE Data_Fetcher SHALL 从天天基金网 (https://fund.eastmoney.com/) 抓取基金基本信息
2. WHEN 抓取基金数据 THEN THE Data_Fetcher SHALL 解析并提取基金代码、名称、最新净值、净值日期
3. WHEN 抓取基金详情 THEN THE Data_Fetcher SHALL 获取前十大持仓股票信息（股票代码、名称、持仓占比）
4. THE Data_Fetcher SHALL 从东方财富网 (https://quote.eastmoney.com/) 获取股票实时行情数据
5. WHEN 获取股票行情 THEN THE Data_Fetcher SHALL 解析并提取股票当前价格、涨跌幅、涨跌额
6. THE Data_Fetcher SHALL 处理网页结构变化导致的解析错误并记录日志
7. IF 数据源返回异常响应 THEN THE Data_Fetcher SHALL 使用缓存数据并标记数据为"待更新"状态

### Requirement 7: 估值计算逻辑

**User Story:** 作为用户，我想通过持仓股票的实时表现了解基金的实时估值，以便做出投资决策。

#### Acceptance Criteria

1. THE Valuation_Calculator SHALL 根据前十大持仓股票的实时涨跌幅和持仓占比计算基金估值涨跌幅
2. WHEN 计算估值 THEN THE Valuation_Calculator SHALL 使用公式：估值涨跌幅 = Σ(股票涨跌幅 × 持仓占比)
3. WHEN 计算估值净值 THEN THE Valuation_Calculator SHALL 使用公式：估值净值 = 昨日净值 × (1 + 估值涨跌幅)
4. THE Valuation_Calculator SHALL 在界面标注"估值仅供参考，以实际净值为准"
5. IF 部分持仓股票数据获取失败 THEN THE Valuation_Calculator SHALL 使用已获取的股票数据计算并标注数据不完整

## Technical Recommendations

### 推荐技术栈

基于用户熟悉 Vue 和 Node.js 的背景，推荐以下技术栈：

1. **前端框架**: Vue 3 + TypeScript
2. **跨平台框架**: Electron (桌面端) + Capacitor (未来移动端扩展)
3. **UI 组件库**: Element Plus 或 Naive UI
4. **状态管理**: Pinia
5. **数据存储**: electron-store (本地持久化)
6. **HTTP 请求**: Axios
7. **构建工具**: Vite + electron-builder

### 应用名称推荐

1. **基盯** - 简洁有力，"盯"字体现实时监控的特点
2. **基金雷达** - 形象化表达实时追踪功能
3. **看基** - 简单直白，易于记忆
4. **基友助手** - 亲切友好，贴近用户
5. **估值通** - 突出核心功能
