<template>
  <div class="fund-list">
    <!-- 列表头部 -->
    <div class="list-header">
      <span class="header-title">自选基金 ({{ funds.length }})</span>
      <div class="header-actions">
        <el-button size="small" @click="handleRefresh">刷新</el-button>
        <el-button-group size="small">
          <el-button
            :type="sortOrder === 'desc' ? 'primary' : 'default'"
            @click="handleSort('desc')"
          >
            涨幅↓
          </el-button>
          <el-button :type="sortOrder === 'asc' ? 'primary' : 'default'" @click="handleSort('asc')">
            涨幅↑
          </el-button>
        </el-button-group>
        <el-button v-if="funds.length > 0" size="small" type="danger" plain @click="handleClearAll">
          清空
        </el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="funds.length === 0" class="empty-state">
      <el-empty description="暂无自选基金，请搜索添加" />
    </div>

    <!-- 基金列表 -->
    <div v-else class="list-content">
      <div
        v-for="fund in sortedFunds"
        :key="fund.code"
        class="fund-item"
        :class="{ 'is-selected': selectedCode === fund.code }"
        @click="handleSelect(fund)"
      >
        <div class="fund-main">
          <div class="fund-info">
            <span class="fund-name">{{ fund.name }}</span>
            <span class="fund-code">{{ fund.code }}</span>
          </div>
          <div class="fund-value">
            <span class="estimated-value">{{ formatValue(fund.estimatedValue) }}</span>
          </div>
        </div>
        <div class="fund-change">
          <span class="change-value" :class="getChangeClass(fund.estimatedChange)">
            {{ formatChange(fund.estimatedChange) }}
          </span>
          <span class="update-time">
            {{ formatTime(fund.updateTime) }}
            <span v-if="fund.isRealValue" class="real-value-tag">已更新</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { Fund } from '@shared/types'

const props = defineProps<{
  funds: Fund[]
  selectedCode?: string
}>()

const emit = defineEmits<{
  (e: 'select', fund: Fund): void
  (e: 'sort', order: 'asc' | 'desc'): void
  (e: 'clear-all'): void
  (e: 'refresh'): void
}>()

const sortOrder = ref<'asc' | 'desc'>('desc')

/**
 * 排序后的基金列表
 * Requirement 3.6: 支持按涨跌幅排序自选列表
 */
const sortedFunds = computed(() => {
  const sorted = [...props.funds]
  if (sortOrder.value === 'desc') {
    sorted.sort((a, b) => b.estimatedChange - a.estimatedChange)
  } else {
    sorted.sort((a, b) => a.estimatedChange - b.estimatedChange)
  }
  return sorted
})

function handleSelect(fund: Fund) {
  emit('select', fund)
}

function handleSort(order: 'asc' | 'desc') {
  sortOrder.value = order
  emit('sort', order)
}

/**
 * 刷新估值数据
 */
function handleRefresh() {
  emit('refresh')
}

/**
 * 清空所有自选基金
 */
async function handleClearAll() {
  try {
    await ElMessageBox.confirm(`确定要清空全部 ${props.funds.length} 个自选基金吗？`, '清空确认', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
    emit('clear-all')
    ElMessage.success('已清空')
  } catch {
    // 用户取消
  }
}

/**
 * 格式化净值显示
 */
function formatValue(value: number): string {
  if (!value || isNaN(value)) return '--'
  return value.toFixed(4)
}

/**
 * 格式化涨跌幅显示
 * Requirement 3.2: 显示今日涨跌幅
 */
function formatChange(change: number): string {
  if (change === undefined || isNaN(change)) return '--'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

/**
 * 获取涨跌颜色类名
 * Requirement 2.4: 通过颜色变化（红涨绿跌）提示用户
 */
function getChangeClass(change: number): string {
  if (change === undefined || isNaN(change)) return 'change-neutral'
  if (change > 0) return 'change-up'
  if (change < 0) return 'change-down'
  return 'change-neutral'
}

/**
 * 格式化更新时间
 * Requirement 3.2: 显示估值时间
 */
function formatTime(time: string): string {
  if (!time) return '--'
  try {
    const date = new Date(time)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return '--'
  }
}
</script>

<style scoped>
.fund-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.empty-state {
  padding: 40px 20px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.fund-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
  transition: background-color 0.2s;
}

.fund-item:hover {
  background-color: #f5f7fa;
}

.fund-item.is-selected {
  background-color: #ecf5ff;
}

.fund-item:last-child {
  border-bottom: none;
}

.fund-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.fund-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.fund-name {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fund-code {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.fund-value {
  font-size: 13px;
  color: #606266;
}

.estimated-value {
  font-family: 'SF Mono', Monaco, monospace;
}

.fund-change {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 12px;
}

.change-value {
  font-size: 16px;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
}

/* 涨跌颜色 - Requirement 2.4 */
.change-up {
  color: #f56c6c;
}

.change-down {
  color: #67c23a;
}

.change-neutral {
  color: #909399;
}

.update-time {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.real-value-tag {
  font-size: 10px;
  color: #67c23a;
  background: #f0f9eb;
  padding: 1px 4px;
  border-radius: 2px;
}

/* 响应式适配 */
@media (max-width: 600px) {
  .list-header {
    padding: 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .header-title {
    font-size: 14px;
  }

  .fund-item {
    padding: 12px;
  }

  .fund-name {
    font-size: 14px;
    max-width: 120px;
  }

  .change-value {
    font-size: 14px;
  }

  .fund-value {
    font-size: 12px;
  }
}

@media (max-width: 400px) {
  .fund-info {
    flex-direction: column;
    gap: 2px;
  }

  .fund-name {
    max-width: 100px;
  }
}
</style>
