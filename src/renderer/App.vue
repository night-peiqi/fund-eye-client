<template>
  <div class="app-container">
    <main class="app-main">
      <!-- 工具栏：搜索 + 估值说明 -->
      <div class="toolbar" :class="{ 'toolbar-collapsed': isToolbarCollapsed }">
        <div class="toolbar-content">
          <div class="toolbar-center">
            <FundSearch @fund-added="handleFundAdded" />
          </div>
          <div class="toolbar-right">
            <el-tooltip content="估值仅供参考，真实数据每天晚上20:00后更新" placement="top">
              <span class="disclaimer">
                <el-icon><InfoFilled /></el-icon>
                估值说明
              </span>
            </el-tooltip>
          </div>
        </div>
        <div class="toolbar-toggle" @click="isToolbarCollapsed = !isToolbarCollapsed">
          <el-icon :class="{ 'rotate-180': isToolbarCollapsed }"><ArrowUp /></el-icon>
        </div>
      </div>

      <!-- 主内容区 -->
      <div class="content-section" :class="{ 'content-collapsed': isToolbarCollapsed }">
        <!-- 自选列表 -->
        <div class="list-panel">
          <FundList
            :funds="watchlistStore.funds"
            :selected-code="selectedFund?.code"
            @select="handleSelectFund"
            @sort="handleSort"
            @clear-all="handleClearAll"
            @refresh="handleRefresh"
          />
        </div>

        <!-- 基金详情 -->
        <div class="detail-panel">
          <FundDetail :fund="selectedFund" @delete="handleDeleteFund" />
        </div>
      </div>
    </main>

    <!-- 更新提示 -->
    <UpdateNotification />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { InfoFilled, ArrowUp } from '@element-plus/icons-vue'
import { FundSearch, FundList, FundDetail, UpdateNotification } from './components'
import { useWatchlistStore } from './stores/watchlist'
import type { Fund, FundBasicInfo } from '@shared/types'

const watchlistStore = useWatchlistStore()

const selectedFund = ref<Fund | null>(null)
const isToolbarCollapsed = ref(false)

/**
 * 初始化：加载自选列表
 */
onMounted(async () => {
  try {
    const result = await window.electronAPI.getWatchlist()
    if (result && result.success && Array.isArray(result.data)) {
      watchlistStore.setFunds(result.data as Fund[])
    }
  } catch (err) {
    console.error('Load watchlist error:', err)
    watchlistStore.setError('加载自选列表失败')
  }

  // 监听估值更新
  window.electronAPI.onValuationUpdate((data) => {
    const updateData = data as { success: boolean; data?: Fund[] }
    if (updateData.success && updateData.data) {
      watchlistStore.setFunds(updateData.data)
      const now = new Date()
      const timeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      console.log(`[${timeStr}] Valuation updated:`, updateData.data)

      // 更新选中的基金详情
      if (selectedFund.value) {
        const updated = updateData.data.find((f) => f.code === selectedFund.value?.code)
        if (updated) {
          selectedFund.value = updated
        }
      }
    }
  })
})

/**
 * 处理基金添加成功
 */
async function handleFundAdded(_fund: FundBasicInfo) {
  // 重新加载列表以获取完整数据
  try {
    const funds = await window.electronAPI.getWatchlist()
    if (funds && Array.isArray(funds)) {
      watchlistStore.setFunds(funds as Fund[])
    }
  } catch (err) {
    console.error('Reload watchlist error:', err)
  }
}

/**
 * 处理选择基金
 */
function handleSelectFund(fund: Fund) {
  if (selectedFund.value?.code === fund.code) {
    selectedFund.value = null
  } else {
    selectedFund.value = fund
  }
}

/**
 * 处理删除基金
 */
function handleDeleteFund(code: string) {
  watchlistStore.removeFund(code)
  if (selectedFund.value?.code === code) {
    selectedFund.value = null
  }
}

/**
 * 处理排序
 */
function handleSort(order: 'asc' | 'desc') {
  watchlistStore.sortByChange(order === 'asc')
}

/**
 * 处理手动刷新
 */
async function handleRefresh() {
  watchlistStore.setError(null)
  try {
    await window.electronAPI.refreshValuation()
  } catch (err) {
    console.error('Refresh error:', err)
  }
}

/**
 * 处理清空自选列表
 */
async function handleClearAll() {
  try {
    await window.electronAPI.clearWatchlist()
    watchlistStore.clearAll()
    selectedFund.value = null
  } catch (err) {
    console.error('Clear watchlist error:', err)
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --header-height: 56px;
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --border-radius: 8px;
  --color-bg: #f5f7fa;
  --color-white: #ffffff;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.15);
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  padding: var(--spacing-lg);
  padding-top: calc(56px + 20px + var(--spacing-lg) + var(--spacing-md));
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  transition: padding-top 0.3s ease;
}

.app-main:has(.content-collapsed) {
  padding-top: calc(20px + var(--spacing-lg));
}

.toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  margin: var(--spacing-lg);
  margin-bottom: 0;
  transition: transform 0.3s ease;
}

.toolbar-collapsed {
  transform: translateY(calc(-100% - var(--spacing-lg)));
}

.toolbar-content {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-white);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-sm);
}

.toolbar-toggle {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 100%);
  width: 48px;
  height: 20px;
  background: var(--color-white);
  border-radius: 0 0 10px 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.toolbar-toggle::before {
  content: '';
  position: absolute;
  top: -8px;
  left: -8px;
  width: 8px;
  height: 8px;
  background: radial-gradient(circle at 0 0, transparent 8px, var(--color-white) 8px);
}

.toolbar-toggle::after {
  content: '';
  position: absolute;
  top: -8px;
  right: -8px;
  width: 8px;
  height: 8px;
  background: radial-gradient(circle at 100% 0, transparent 8px, var(--color-white) 8px);
}

.toolbar-toggle:hover {
  background: #f5f7fa;
}

.toolbar-toggle .el-icon {
  font-size: 14px;
  color: #909399;
  transition: transform 0.3s ease;
}

.toolbar-toggle .rotate-180 {
  transform: rotate(180deg);
}

.search-section {
  background: var(--color-white);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.toolbar-center {
  flex: 1;
  min-width: 200px;
}

.toolbar-right {
  flex-shrink: 0;
  height: 32px;
  display: flex;
  align-items: center;
}

.disclaimer {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  cursor: help;
  font-size: 13px;
}

.disclaimer:hover {
  color: #606266;
}

.content-section {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(400px, 1.2fr);
  gap: var(--spacing-md);
  flex: 1;
  min-height: 0;
}

.list-panel {
  min-width: 0;
  overflow: hidden;
}

.detail-panel {
  min-width: 0;
  overflow: hidden;
}

/* 大屏幕优化 (>1400px) */
@media (min-width: 1400px) {
  .app-main {
    padding: var(--spacing-xl) calc(var(--spacing-xl) * 2);
  }

  .content-section {
    grid-template-columns: minmax(400px, 1fr) minmax(500px, 1.5fr);
    gap: var(--spacing-xl);
  }
}

/* 中等屏幕 (900px - 1200px) */
@media (max-width: 1200px) {
  .content-section {
    grid-template-columns: 1fr 1fr;
  }
}

/* 平板和小屏幕 (<900px) - 单列布局 */
@media (max-width: 900px) {
  .app-main {
    padding: var(--spacing-sm);
    padding-top: calc(56px + 20px + var(--spacing-lg) + var(--spacing-sm));
    gap: var(--spacing-sm);
  }

  .app-main:has(.content-collapsed) {
    padding-top: calc(20px + var(--spacing-lg));
  }

  .content-section {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }

  .toolbar {
    flex-wrap: wrap;
  }

  .toolbar-center {
    order: 3;
    width: 100%;
    min-width: 100%;
  }
}

/* 移动端适配 (<600px) */
@media (max-width: 600px) {
  .app-header {
    padding: var(--spacing-sm) var(--spacing-md);
  }

  .app-header h1 {
    font-size: 18px;
  }

  .app-main {
    padding: var(--spacing-xs);
    padding-top: calc(56px + 20px + var(--spacing-lg) + var(--spacing-xs));
    gap: var(--spacing-xs);
  }

  .app-main:has(.content-collapsed) {
    padding-top: calc(20px + var(--spacing-lg));
  }

  .search-section {
    padding: var(--spacing-sm);
    border-radius: calc(var(--border-radius) / 2);
  }

  .content-section {
    gap: var(--spacing-xs);
  }
}

/* 超小屏幕 (<400px) */
@media (max-width: 400px) {
  .app-header h1 {
    font-size: 16px;
  }
}

/* 横屏模式优化 */
@media (max-height: 500px) and (orientation: landscape) {
  .app-header {
    padding: var(--spacing-xs) var(--spacing-md);
  }

  .app-header h1 {
    font-size: 16px;
  }

  .app-main {
    padding: var(--spacing-xs);
    padding-top: calc(56px + 20px + var(--spacing-lg) + var(--spacing-xs));
  }

  .app-main:has(.content-collapsed) {
    padding-top: calc(20px + var(--spacing-lg));
  }

  .content-section {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
