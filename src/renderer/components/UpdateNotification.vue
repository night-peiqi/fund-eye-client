<template>
  <el-dialog
    v-model="visible"
    title="发现新版本"
    width="450px"
    :close-on-click-modal="false"
    :show-close="!downloading"
  >
    <div class="update-content">
      <p>
        新版本 <strong>v{{ updateInfo.version }}</strong> 已发布
      </p>
      <p class="release-date">发布时间: {{ formatDate(updateInfo.releaseDate) }}</p>

      <div v-if="updateInfo.releaseNotes" class="release-notes">
        <p class="notes-title">更新内容:</p>
        <div class="notes-content" v-html="updateInfo.releaseNotes"></div>
      </div>

      <div v-if="downloading" class="progress-section">
        <el-progress :percentage="progress" :stroke-width="10" />
        <p class="progress-text">{{ progressText }}</p>
      </div>
    </div>

    <template #footer>
      <template v-if="!downloaded">
        <el-button :disabled="downloading" @click="visible = false">稍后提醒</el-button>
        <el-button type="primary" :loading="downloading" @click="handleDownload">
          {{ downloading ? '下载中...' : '立即更新' }}
        </el-button>
      </template>
      <template v-else>
        <el-button @click="visible = false">稍后安装</el-button>
        <el-button type="primary" @click="handleInstall">立即安装</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const visible = ref(false)
const downloading = ref(false)
const downloaded = ref(false)
const progress = ref(0)
const transferred = ref(0)
const total = ref(0)

const updateInfo = ref({
  version: '',
  releaseDate: '',
  releaseNotes: ''
})

const progressText = computed(() => {
  if (total.value === 0) return '准备下载...'
  const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1)
  return `${mb(transferred.value)} MB / ${mb(total.value)} MB`
})

function formatDate(dateStr: string) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

async function handleDownload() {
  downloading.value = true
  await window.electronAPI.downloadUpdate()
}

function handleInstall() {
  window.electronAPI.installUpdate()
}

onMounted(() => {
  window.electronAPI.onUpdateAvailable((data) => {
    updateInfo.value = {
      version: data.version,
      releaseDate: data.releaseDate,
      releaseNotes: data.releaseNotes || ''
    }
    visible.value = true
  })

  window.electronAPI.onUpdateProgress((data) => {
    progress.value = Math.round(data.percent)
    transferred.value = data.transferred
    total.value = data.total
  })

  window.electronAPI.onUpdateDownloaded(() => {
    downloading.value = false
    downloaded.value = true
  })

  window.electronAPI.onUpdateError((error) => {
    downloading.value = false
    console.error('Update error:', error)
  })
})
</script>

<style scoped>
.update-content {
  text-align: center;
}

.update-content p {
  margin: 8px 0;
}

.release-date {
  color: #909399;
  font-size: 13px;
}

.progress-section {
  margin-top: 20px;
}

.progress-text {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.release-notes {
  margin-top: 16px;
  text-align: left;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.notes-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.notes-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.notes-content ul {
  padding-left: 20px;
  margin: 0;
}

.notes-content li {
  margin: 4px 0;
}
</style>
