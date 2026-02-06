<template>
  <div class="fund-detail">
    <div v-if="!fund" class="no-selection">
      <el-empty description="点击左侧基金可查看前十大持仓" />
    </div>

    <template v-else>
      <!-- 基金基本信息 -->
      <div class="detail-header">
        <div class="header-info">
          <h2 class="fund-name">{{ fund.name }}</h2>
          <span class="fund-code">{{ fund.code }}</span>
        </div>
        <el-button type="danger" size="small" :loading="deleting" @click="handleDelete">
          删除
        </el-button>
      </div>

      <!-- 估值信息 -->
      <div class="valuation-section">
        <div class="valuation-main">
          <span class="valuation-label">估值净值</span>
          <span class="valuation-value">{{ formatValue(fund.estimatedValue) }}</span>
          <span class="valuation-change" :class="getChangeClass(fund.estimatedChange)">
            {{ formatChange(fund.estimatedChange) }}
          </span>
        </div>
        <div class="valuation-meta">
          <span>昨日净值: {{ formatValue(fund.netValue) }}</span>
          <span>净值日期: {{ fund.netValueDate }}</span>
          <span>更新时间: {{ formatTime(fund.updateTime) }}</span>
        </div>
      </div>

      <!-- 前十大持仓 -->
      <div class="holdings-section">
        <h3 class="section-title">前十大持仓</h3>

        <div v-if="fund.holdings.length === 0" class="no-holdings">
          <el-empty description="暂无持仓数据" :image-size="60" />
        </div>

        <el-table v-else :data="fund.holdings" stripe size="small" class="holdings-table">
          <el-table-column prop="stockName" label="股票名称" min-width="100">
            <template #default="{ row }">
              <span class="stock-name">{{ row.stockName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="stockCode" label="代码" width="80">
            <template #default="{ row }">
              <span class="stock-code">{{ row.stockCode }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="ratio" label="占比" width="70" align="right">
            <template #default="{ row }"> {{ row.ratio.toFixed(2) }}% </template>
          </el-table-column>
          <el-table-column prop="change" label="涨跌幅" width="80" align="right">
            <template #default="{ row }">
              <span :class="getChangeClass(row.change)">
                {{ formatChange(row.change) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="现价" width="80" align="right">
            <template #default="{ row }">
              {{ row.price ? row.price.toFixed(2) : '--' }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Fund } from '@shared/types'

const props = defineProps<{
  fund: Fund | null
}>()

const emit = defineEmits<{
  (e: 'delete', code: string): void
}>()

const deleting = ref(false)

/**
 * 删除基金
 * Requirement 3.5: 用户选择删除基金时，从自选列表中移除该基金
 */
async function handleDelete() {
  if (!props.fund) return

  try {
    await ElMessageBox.confirm(`确定要删除「${props.fund.name}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    deleting.value = true

    try {
      await window.electronAPI.removeFund(props.fund.code)
      emit('delete', props.fund.code)
      ElMessage.success('删除成功')
    } catch (err) {
      ElMessage.error('删除失败')
      console.error('Delete fund error:', err)
    } finally {
      deleting.value = false
    }
  } catch {
    // 用户取消删除
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
 */
function formatChange(change: number): string {
  if (change === undefined || isNaN(change)) return '--'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

/**
 * 获取涨跌颜色类名
 */
function getChangeClass(change: number): string {
  if (change === undefined || isNaN(change)) return 'change-neutral'
  if (change > 0) return 'change-up'
  if (change < 0) return 'change-down'
  return 'change-neutral'
}

/**
 * 格式化更新时间
 */
function formatTime(time: string): string {
  if (!time) return '--'
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
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
.fund-detail {
  background: white;
  border-radius: 8px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 200px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
}

.fund-name {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  word-break: break-word;
}

.fund-code {
  font-size: 14px;
  color: #909399;
  flex-shrink: 0;
}

.valuation-section {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.valuation-main {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.valuation-label {
  font-size: 14px;
  color: #606266;
}

.valuation-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  font-family: 'SF Mono', Monaco, monospace;
}

.valuation-change {
  font-size: 18px;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
}

.valuation-meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #909399;
  flex-wrap: wrap;
}

.holdings-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  flex-shrink: 0;
}

.no-holdings {
  padding: 20px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.holdings-table {
  width: 100%;
  flex: 1;
  overflow: auto;
}

.stock-name {
  font-weight: 500;
}

.stock-code {
  color: #909399;
  font-size: 12px;
}

/* 涨跌颜色 */
.change-up {
  color: #f56c6c;
}

.change-down {
  color: #67c23a;
}

.change-neutral {
  color: #909399;
}

/* 响应式适配 */
@media (max-width: 900px) {
  .fund-detail {
    padding: 16px;
  }

  .valuation-meta {
    gap: 12px;
  }
}

@media (max-width: 600px) {
  .fund-detail {
    padding: 12px;
  }

  .detail-header {
    flex-direction: column;
    gap: 12px;
  }

  .fund-name {
    font-size: 18px;
  }

  .valuation-section {
    padding: 12px;
  }

  .valuation-value {
    font-size: 24px;
  }

  .valuation-change {
    font-size: 16px;
  }

  .valuation-meta {
    flex-direction: column;
    gap: 4px;
  }

  .section-title {
    font-size: 14px;
    margin-bottom: 12px;
  }
}

@media (max-width: 400px) {
  .valuation-main {
    flex-direction: column;
    gap: 4px;
  }

  .valuation-value {
    font-size: 22px;
  }
}
</style>
