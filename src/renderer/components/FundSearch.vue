<template>
  <div class="fund-search">
    <div class="search-input-wrapper">
      <el-input
        v-model="searchCode"
        placeholder="输入基金代码搜索"
        :disabled="loading"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #append>
          <el-button :loading="loading" @click="handleSearch"> 搜索 </el-button>
        </template>
      </el-input>
    </div>

    <!-- 搜索结果展示 -->
    <div v-if="searchResult" class="search-result">
      <el-card shadow="hover">
        <div class="result-info">
          <div class="result-header">
            <span class="fund-name">{{ searchResult.name }}</span>
            <span class="fund-code">{{ searchResult.code }}</span>
          </div>
          <div class="result-details">
            <span class="fund-type">{{ searchResult.type }}</span>
            <span class="fund-value">
              净值: {{ searchResult.netValue?.toFixed(4) ?? '--' }}
              <span class="value-date">({{ searchResult.netValueDate ?? '--' }})</span>
            </span>
          </div>
        </div>
        <div class="result-actions">
          <el-button type="primary" :loading="adding" @click="handleAdd"> 添加到自选 </el-button>
          <el-button @click="clearResult">取消</el-button>
        </div>
      </el-card>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="search-error">
      <el-alert :title="error" type="error" show-icon :closable="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FundBasicInfo, Fund } from '@shared/types'
import { useWatchlistStore } from '../stores/watchlist'

const emit = defineEmits<{
  (e: 'fund-added', fund: FundBasicInfo): void
}>()

const watchlistStore = useWatchlistStore()

const searchCode = ref('')
const searchResult = ref<FundBasicInfo | null>(null)
const loading = ref(false)
const adding = ref(false)
const error = ref<string | null>(null)

/**
 * 搜索基金
 * Requirement 1.1: 用户输入基金代码并提交搜索
 */
async function handleSearch() {
  const code = searchCode.value.trim()
  if (!code) {
    error.value = '请输入基金代码'
    return
  }

  // 验证基金代码格式（6位数字）
  if (!/^\d{6}$/.test(code)) {
    error.value = '基金代码应为6位数字'
    return
  }

  loading.value = true
  error.value = null
  searchResult.value = null

  try {
    const result = await window.electronAPI.searchFund(code)

    if (result && result.success) {
      // Requirement 1.2: 显示基金名称、代码和当前估值供用户确认
      searchResult.value = result.data as FundBasicInfo
    } else {
      // Requirement 1.5: 搜索的基金代码不存在时显示错误提示
      error.value = result?.error || '未找到该基金'
    }
  } catch (err) {
    error.value = '搜索失败，请检查网络连接'
    console.error('Search fund error:', err)
  } finally {
    loading.value = false
  }
}

/**
 * 添加基金到自选列表
 * Requirement 1.3: 用户确认添加基金
 */
async function handleAdd() {
  if (!searchResult.value || adding.value) return

  // 检查是否已存在
  if (watchlistStore.hasFund(searchResult.value.code)) {
    ElMessage.warning('该基金已在自选列表中')
    return
  }

  adding.value = true

  try {
    const result = await window.electronAPI.addFund(searchResult.value.code)

    if (result && result.success && result.data) {
      // 直接添加到 store
      watchlistStore.addFund(result.data as Fund)
      emit('fund-added', searchResult.value)
      ElMessage.success('添加成功')
      clearResult()
      searchCode.value = ''
    } else {
      ElMessage.error(result?.error || '添加失败')
    }
  } catch (err) {
    ElMessage.error('添加失败，请重试')
    console.error('Add fund error:', err)
  } finally {
    adding.value = false
  }
}

function clearResult() {
  searchResult.value = null
  error.value = null
}
</script>

<style scoped>
.fund-search {
  /* margin removed - handled by parent */
}

.search-input-wrapper {
  max-width: 400px;
  width: 100%;
}

.search-result {
  margin-top: 16px;
  max-width: 400px;
}

.result-info {
  margin-bottom: 16px;
}

.result-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.fund-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  word-break: break-word;
}

.fund-code {
  font-size: 14px;
  color: #909399;
}

.result-details {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #606266;
  flex-wrap: wrap;
}

.fund-type {
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.value-date {
  color: #909399;
  font-size: 12px;
}

.result-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-error {
  margin-top: 16px;
  max-width: 400px;
}

/* 响应式适配 */
@media (max-width: 600px) {
  .search-input-wrapper {
    max-width: 100%;
  }

  .search-result {
    max-width: 100%;
  }

  .fund-name {
    font-size: 16px;
  }

  .result-details {
    gap: 8px;
    font-size: 13px;
  }

  .result-actions {
    gap: 8px;
  }

  .search-error {
    max-width: 100%;
  }
}
</style>
