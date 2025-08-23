<template>
  <div class="bookmarks-page">
    <div class="content-wrapper" v-if="currentBookmark">
      <div class="bookmark-card">
        <div class="bookmark-header">
          <div class="progress-info" v-if="bookmarks.length > 0">
            <span class="progress-text">进度: {{ currentIndex + 1 }} / {{ totalCount }}</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            </div>
          </div>
          <div class="bookmark-all-info">
            <div class="bookmark-title-section">
              <label class="field-label">书签名称</label>
              <div class="name-edit-wrapper">
                <input
                  v-if="isEditingName"
                  v-model="editedName"
                  @blur="saveBookmarkName"
                  @keyup.enter="saveBookmarkName"
                  @keyup.esc="cancelEditName"
                  class="name-input"
                  ref="nameInput"
                  type="text"
                />
                <div v-else class="name-display" @click="startEditName">
                  <span class="bookmark-name">{{ currentBookmark.name }}</span>
                  <svg class="edit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div class="bookmark-url-section">
              <label class="field-label">URL</label>
              <a :href="currentBookmark.url" target="_blank" class="bookmark-url">
                {{ currentBookmark.url }}
                <svg class="link-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
            <div class="bookmark-description-section">
              <label class="field-label">描述</label>
              <div class="description-edit-wrapper">
                <input
                  v-if="isEditingDescription"
                  v-model="editedDescription"
                  @blur="saveBookmarkDescription"
                  @keyup.enter="saveBookmarkDescription"
                  @keyup.esc="cancelEditDescription"
                  class="description-input-inline"
                  ref="descriptionInput"
                  placeholder="添加书签描述..."
                  type="text"
                />
                <div v-else class="description-display-inline" @click="startEditDescription">
                  <span class="bookmark-description">{{ currentBookmark.description || '点击添加描述...' }}</span>
                  <svg class="edit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="preview-container">
          <div class="preview-header">
            <span class="preview-title">网站预览</span>
            <div class="preview-actions">
              <button @click="reloadIframe" class="action-button" title="刷新预览">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
              <button @click="deleteBookmark" class="action-button delete-button" title="删除书签">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="iframe-wrapper">
            <iframe 
              v-if="currentBookmark?.url"
              :key="iframeKey"
              :src="currentBookmark.url"
              class="url-preview-iframe"
              frameborder="0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              @error="handleIframeError"
              @load="handleIframeLoad"
            />
            <div v-else class="preview-placeholder">
              <span class="preview-label">URL预览</span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-selection">
        <div class="space-header">
          <h3 class="space-title">选择空间</h3>
          <button @click="fetchSpaces" class="refresh-spaces-button" title="刷新空间列表">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
        <div class="space-grid py-2">
          <button
            v-for="space in spaces"
            :key="space.id"
            class="space-item"
            @click="assignToSpace(space.id)"
            :title="space.name"
          >
            <Icon v-if="space.icon" :name="space.icon" :size="20" />
            <span class="space-name">{{ space.name }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else-if="!loading && bookmarks.length === 0">
      <p>没有找到游离的书签</p>
    </div>

    <div class="loading-state" v-else-if="loading">
      <p>加载中...</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import Icon from '@/components/Base/Icon.vue'
import { BookmarkAPI, SpaceAPI } from '@/services/api'
import type { BookmarkResp, SpaceRespSimple } from '@/types/api'

const bookmarks = ref<BookmarkResp[]>([])
const spaces = ref<SpaceRespSimple[]>([])
const currentBookmark = ref<BookmarkResp | null>(null)
const loading = ref(true)
const isEditingName = ref(false)
const editedName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const isEditingDescription = ref(false)
const editedDescription = ref('')
const descriptionInput = ref<HTMLTextAreaElement | null>(null)
const currentIndex = ref(0)
const totalCount = ref(0)
const iframeKey = ref(0)

const progressPercentage = computed(() => {
  if (totalCount.value === 0) return 0
  return ((currentIndex.value + 1) / totalCount.value) * 100
})

const fetchBookmarksWithoutSpace = async () => {
  try {
    loading.value = true
    const response = await BookmarkAPI.noSpaceBookmark()
    bookmarks.value = response.data
    totalCount.value = bookmarks.value.length
    currentIndex.value = 0
    if (bookmarks.value.length > 0) {
      currentBookmark.value = bookmarks.value[0]
    }
  } catch (error) {
    console.error('Failed to fetch bookmarks without space:', error)
  } finally {
    loading.value = false
  }
}

const fetchSpaces = async () => {
  try {
    const response = await SpaceAPI.getAllList()
    console.log('Spaces response:', response)
    spaces.value = response.data.records || response.data
  } catch (error) {
    console.error('Failed to fetch spaces:', error)
  }
}

const startEditName = () => {
  if (!currentBookmark.value) return
  isEditingName.value = true
  editedName.value = currentBookmark.value.name
  nextTick(() => {
    nameInput.value?.focus()
    nameInput.value?.select()
  })
}

const saveBookmarkName = async () => {
  if (!currentBookmark.value || !editedName.value.trim()) {
    cancelEditName()
    return
  }
  
  try {
    await BookmarkAPI.update({
      id: currentBookmark.value.id,
      name: editedName.value.trim()
    })
    currentBookmark.value.name = editedName.value.trim()
    isEditingName.value = false
  } catch (error) {
    console.error('Failed to update bookmark name:', error)
    cancelEditName()
  }
}

const cancelEditName = () => {
  isEditingName.value = false
  editedName.value = ''
}

const startEditDescription = () => {
  if (!currentBookmark.value) return
  isEditingDescription.value = true
  editedDescription.value = currentBookmark.value.description || ''
  nextTick(() => {
    descriptionInput.value?.focus()
    descriptionInput.value?.select()
  })
}

const saveBookmarkDescription = async () => {
  if (!currentBookmark.value) {
    cancelEditDescription()
    return
  }
  
  try {
    await BookmarkAPI.update({
      id: currentBookmark.value.id,
      description: editedDescription.value.trim()
    })
    currentBookmark.value.description = editedDescription.value.trim()
    isEditingDescription.value = false
  } catch (error) {
    console.error('Failed to update bookmark description:', error)
    cancelEditDescription()
  }
}

const cancelEditDescription = () => {
  isEditingDescription.value = false
  editedDescription.value = ''
}

const assignToSpace = async (spaceId: string) => {
  if (!currentBookmark.value) return
  
  try {
    const updateData: any = {
      id: currentBookmark.value.id,
      namespaceId: spaceId
    }
    
    if (editedName.value.trim() && editedName.value !== currentBookmark.value.name) {
      updateData.name = editedName.value.trim()
    }
    
    if (editedDescription.value.trim() !== (currentBookmark.value.description || '')) {
      updateData.description = editedDescription.value.trim()
    }
    
    await BookmarkAPI.update(updateData)
    
    bookmarks.value = bookmarks.value.filter(b => b.id !== currentBookmark.value!.id)
    
    if (bookmarks.value.length > 0) {
      currentIndex.value++
      currentBookmark.value = bookmarks.value[0]
      editedName.value = ''
      isEditingName.value = false
      editedDescription.value = ''
      isEditingDescription.value = false
      iframeKey.value++
    } else {
      currentBookmark.value = null
    }
  } catch (error) {
    console.error('Failed to assign bookmark to space:', error)
  }
}

const reloadIframe = () => {
  iframeKey.value++
}

const handleIframeLoad = () => {
  // iframe loaded successfully
}

const deleteBookmark = async () => {
  if (!currentBookmark.value) return
  
  try {
    await BookmarkAPI.delete(currentBookmark.value.id)
    
    bookmarks.value = bookmarks.value.filter(b => b.id !== currentBookmark.value!.id)
    
    if (bookmarks.value.length > 0) {
      currentBookmark.value = bookmarks.value[0]
      editedName.value = ''
      isEditingName.value = false
      editedDescription.value = ''
      isEditingDescription.value = false
      iframeKey.value++
    } else {
      currentBookmark.value = null
    }
  } catch (error) {
    console.error('Failed to delete bookmark:', error)
  }
}

const handleIframeError = () => {
  console.warn('Failed to load URL preview for:', currentBookmark.value?.url)
}

onMounted(() => {
  fetchBookmarksWithoutSpace()
  fetchSpaces()
})
</script>

<style scoped>
.bookmarks-page {
  padding: 20px;
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  overflow: hidden;
}

.header {
  flex-shrink: 0;
  margin-bottom: 20px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.subtitle {
  color: #6b7280;
  font-size: 14px;
}

.progress-info {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-text {
  font-size: 13px;
  color: #4b5563;
  font-weight: 500;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 0.3s ease;
}

.content-wrapper {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  min-height: 0;
}

.bookmark-card {
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.bookmark-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.bookmark-all-info {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  align-items: end;
}

.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.name-edit-wrapper,
.description-edit-wrapper {
  position: relative;
}

.name-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  height: 44px;
  box-sizing: border-box;
}

.name-display:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.bookmark-name {
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
  flex: 1;
}

.edit-icon {
  color: #9ca3af;
  transition: color 0.2s;
}

.name-display:hover .edit-icon {
  color: #6b7280;
}

.name-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  outline: none;
  height: 44px;
  box-sizing: border-box;
}

.description-display-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  height: 44px;
  box-sizing: border-box;
}

.description-display-inline:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.bookmark-description {
  font-size: 14px;
  color: #1f2937;
  flex: 1;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.description-display-inline .bookmark-description {
  color: #9ca3af;
}

.description-display-inline:hover .bookmark-description {
  color: #6b7280;
}

.description-input-inline {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  color: #1f2937;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  outline: none;
  height: 44px;
  box-sizing: border-box;
  font-family: inherit;
}

.bookmark-url {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #3b82f6;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  word-break: break-all;
  height: 44px;
  box-sizing: border-box;
}

.bookmark-url:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

.link-icon {
  flex-shrink: 0;
}

.preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview-header {
  padding: 12px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #4b5563;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 6px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
}

.action-button:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #4b5563;
}

.delete-button:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #dc2626;
}

.iframe-wrapper {
  flex: 1;
  position: relative;
  background: white;
}

.url-preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.preview-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f9fafb;
}

.preview-label {
  color: #9ca3af;
  font-size: 14px;
}

.space-selection {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
}

.space-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.space-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.refresh-spaces-button {
  padding: 6px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-spaces-button:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #4b5563;
}

.space-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
}

.space-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.space-item:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.space-name {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  text-align: center;
  word-break: break-word;
  line-height: 1.3;
}


.empty-state,
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  color: #6b7280;
  font-size: 16px;
}
</style>