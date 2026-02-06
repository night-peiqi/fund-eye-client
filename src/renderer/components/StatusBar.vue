<template>
  <div class="status-bar">
    <!-- 网络状态指示 -->
    <div class="status-item">
      <span class="status-dot" :class="connectionClass"></span>
      <span class="status-text">{{ connectionText }}</span>
    </div>

    <!-- 更新时间显示 -->
    <div v-if="lastUpdateTime" class="status-item">
      <span class="status-label">最后更新:</span>
      <span class="status-value">{{ formattedUpdateTime }}</span>
    </div>

    <!-- 手动刷新按钮 -->
    <el-button size="small" :loading="refreshing" :disabled="!isConnected" @click="handleRefresh">
      刷新
    </el-button>

    <!-- 估值说明 -->
    <el-tooltip content="估值仅供参考，真实数据每天晚上20:00后更新" placement="top">
      <span class="disclaimer">
        <el-icon><InfoFilled /></el-icon>
        估值说明
      </span>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  lastUpdateTime: string | null
  isConnected: boolean
  hasError: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const refreshing = ref(false)

/**
 * 连接状态样式类
 * Requirement 2.5: 网络连接中断时显示连接状态提示
 */
const connectionClass = computed(() => {
  if (props.hasError) return 'status-error'
  if (props.isConnected) return 'status-connected'
  return 'status-disconnected'
})

/**
 * 连接状态文本
 */
const connectionText = computed(() => {
  if (props.hasError) return props.errorMessage || '连接异常'
  if (props.isConnected) return '已连接'
  return '未连接'
})

/**
 * 格式化更新时间
 * Requirement 2.3: 估值数据更新成功时刷新界面显示
 */
const formattedUpdateTime = computed(() => {
  if (!props.lastUpdateTime) return '--'
  try {
    const date = new Date(props.lastUpdateTime)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return '--'
  }
})

/**
 * 手动刷新
 * Requirement 2.6: 用户手动触发刷新时立即重新计算最新估值数据
 */
async function handleRefresh() {
  refreshing.value = true

  try {
    await window.electronAPI.refreshValuation()
    emit('refresh')
    ElMessage.success('刷新成功')
  } catch (err) {
    ElMessage.error('刷新失败，请检查网络连接')
    console.error('Refresh error:', err)
  } finally {
    refreshing.value = false
  }
}
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-connected {
  background-color: #67c23a;
  box-shadow: 0 0 6px rgba(103, 194, 58, 0.5);
}

.status-disconnected {
  background-color: #909399;
}

.status-error {
  background-color: #f56c6c;
  box-shadow: 0 0 6px rgba(245, 108, 108, 0.5);
}

.status-text {
  color: #606266;
}

.status-label {
  color: #909399;
}

.status-value {
  color: #303133;
  font-family: 'SF Mono', Monaco, monospace;
}

.disclaimer {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  cursor: help;
  margin-left: auto;
}

.disclaimer:hover {
  color: #606266;
}

/* 响应式适配 */
@media (max-width: 600px) {
  .status-bar {
    padding: 10px 12px;
    gap: 12px;
    font-size: 12px;
  }

  .disclaimer {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 400px) {
  .status-bar {
    gap: 8px;
  }

  .status-item {
    gap: 4px;
  }
}
</style>
