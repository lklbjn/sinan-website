<template>
  <div class="p-5 h-[calc(100vh-64px)] flex flex-col bg-background overflow-hidden">
    <div class="flex-1 grid grid-cols-[1fr_320px] gap-5 min-h-0" v-if="currentBookmark">
      <div class="bg-card border border-border/60 rounded-xl flex flex-col shadow-sm overflow-hidden">
        <div class="p-5 border-b border-border/40">
          <div class="flex items-center gap-3 mb-4" v-if="bookmarks.length > 0">
            <span class="text-sm text-muted-foreground font-medium">进度: {{ processedCount }} / {{ totalCount }}</span>
            <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div class="h-full bg-primary transition-all duration-300 ease-in-out" :style="{ width: progressPercentage + '%' }"></div>
            </div>
          </div>
          <div class="grid grid-cols-4 gap-5 items-end">
            <!-- 书签名称 -->
            <div class="min-w-0">
              <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">书签名称</label>
              <div class="relative">
                <input
                  v-if="isEditingName"
                  v-model="editedName"
                  @blur="saveBookmarkName"
                  @keyup.enter="saveBookmarkName"
                  @keyup.esc="cancelEditName"
                  class="w-full px-3 py-2.5 text-base font-medium text-foreground bg-background border border-primary rounded-lg outline-none h-11 box-border"
                  ref="nameInput"
                  type="text"
                />
                <div v-else class="flex items-center gap-2 px-3 py-2.5 bg-muted/50 border border-border/60 rounded-lg cursor-pointer transition-all hover:bg-muted/70 hover:border-border/80 h-11 box-border" @click="startEditName">
                  <span class="text-base font-medium text-foreground flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{{ currentBookmark.name }}</span>
                  <svg class="w-4 h-4 text-muted-foreground transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- URL -->
            <div class="min-w-0">
              <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">URL</label>
              <a :href="currentBookmark.url" target="_blank" class="flex items-center gap-1.5 px-3 py-2.5 bg-muted/50 border border-border/60 rounded-lg text-primary no-underline text-sm transition-all hover:bg-primary/10 hover:border-primary/50 h-11 box-border whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                <span class="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{{ currentBookmark.url }}</span>
                <svg class="w-3.5 h-3.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
            
            <!-- 描述 -->
            <div class="min-w-0">
              <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">描述</label>
              <div class="relative">
                <input
                  v-if="isEditingDescription"
                  v-model="editedDescription"
                  @blur="saveBookmarkDescription"
                  @keyup.enter="saveBookmarkDescription"
                  @keyup.esc="cancelEditDescription"
                  class="w-full px-3 py-2.5 text-sm text-foreground bg-background border border-primary rounded-lg outline-none h-11 box-border font-inherit"
                  ref="descriptionInput"
                  placeholder="添加书签描述..."
                  type="text"
                />
                <div v-else class="flex items-center gap-2 px-3 py-2.5 bg-muted/50 border border-border/60 rounded-lg cursor-pointer transition-all hover:bg-muted/70 hover:border-border/80 h-11 box-border" @click="startEditDescription">
                  <span class="text-sm text-muted-foreground flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{{ currentBookmark.description || '点击添加描述...' }}</span>
                  <svg class="w-4 h-4 text-muted-foreground transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- 标签 -->
            <div class="min-w-0 relative tag-dropdown-container">
              <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">标签</label>
              <div 
                @click="toggleTagDropdown"
                class="relative flex items-center gap-2 px-3 py-2.5 bg-background border border-border/60 rounded-lg cursor-pointer transition-all hover:border-border/80 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 h-11 box-border"
              >
                <!-- 已选标签 -->
                <div class="flex flex-wrap gap-1 items-center flex-1">
                  <!-- 显示第一个标签 -->
                  <div 
                    v-if="selectedTagNames.length > 0"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs"
                    :style="{ 
                      borderColor: getTagColor(selectedTagNames[0]), 
                      backgroundColor: getTagColor(selectedTagNames[0]) + '20',
                      color: getTagColor(selectedTagNames[0])
                    }"
                  >
                    <div 
                      class="w-1.5 h-1.5 rounded-full" 
                      :style="{ backgroundColor: getTagColor(selectedTagNames[0]) }"
                    ></div>
                    <span>{{ selectedTagNames[0] }}</span>
                    <button 
                      @click.stop="removeTag(selectedTagNames[0])"
                      class="ml-0.5 hover:bg-black/10 rounded-sm p-0.5"
                    >
                      <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  
                  <!-- 显示剩余标签数量 -->
                  <div 
                    v-if="selectedTagNames.length > 1"
                    class="inline-flex items-center px-1.5 py-0.5 rounded border text-xs bg-muted/50 border-muted-foreground/30 text-muted-foreground"
                  >
                    +{{ selectedTagNames.length - 1 }}
                  </div>
                  
                  <!-- 占位文字 - 左对齐垂直居中 -->
                  <span v-if="selectedTagNames.length === 0" class="text-muted-foreground text-sm">
                    选择标签...
                  </span>
                </div>
                
                <!-- 下拉箭头 -->
                <div class="flex-shrink-0">
                  <svg 
                    class="w-3 h-3 text-muted-foreground transition-transform"
                    :class="{ 'rotate-180': isTagDropdownOpen }"
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2"
                  >
                    <polyline points="6,9 12,15 18,9"></polyline>
                  </svg>
                </div>
              </div>
              
              <!-- 悬浮下拉列表 -->
              <div 
                v-if="isTagDropdownOpen"
                class="absolute top-full left-0 right-0 mt-1 bg-background border border-border/60 rounded-lg shadow-lg z-50 max-h-64 overflow-hidden"
              >
                <!-- 搜索输入框 -->
                <div class="p-3 border-b border-border/40">
                  <input
                    ref="tagSearchInput"
                    v-model="tagSearchQuery"
                    @input="filterTags"
                    placeholder="搜索标签..."
                    class="w-full px-3 py-2 text-sm border border-border/60 rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                
                <!-- 标签列表 -->
                <div class="p-2 max-h-48 overflow-y-auto">
                  <div class="grid gap-1">
                    <button
                      v-for="tag in filteredTags"
                      :key="tag.id"
                      @click="toggleTagSelection(tag)"
                      class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 rounded-md transition-colors"
                      :class="{ 'bg-primary/10': selectedTagNames.includes(tag.name) }"
                    >
                      <!-- 选择状态指示器 -->
                      <div class="flex items-center justify-center w-4 h-4">
                        <div 
                          v-if="selectedTagNames.includes(tag.name)"
                          class="w-3 h-3 bg-primary rounded-sm flex items-center justify-center"
                        >
                          <svg class="w-2 h-2 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20,6 9,17 4,12"></polyline>
                          </svg>
                        </div>
                        <div 
                          v-else
                          class="w-3 h-3 border border-border/60 rounded-sm"
                        ></div>
                      </div>
                      
                      <!-- 标签颜色和名称 -->
                      <div 
                        class="w-3 h-3 rounded-full border border-border/40" 
                        :style="{ backgroundColor: tag.color }"
                      ></div>
                      <span class="text-sm">{{ tag.name }}</span>
                    </button>
                    
                    <!-- 无搜索结果 -->
                    <div v-if="filteredTags.length === 0" class="px-3 py-4 text-center text-muted-foreground text-sm">
                      未找到匹配的标签
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex-1 flex flex-col min-h-0">
          <div class="px-5 py-3 bg-muted/30 border-b border-border/40 flex justify-between items-center">
            <span class="text-sm font-semibold text-muted-foreground">网站预览</span>
            <div class="flex gap-2">
              <button @click="reloadIframe" class="p-1.5 bg-background/80 border border-border/60 rounded-md cursor-pointer transition-all text-muted-foreground hover:bg-muted/50 hover:border-border/80 hover:text-foreground" title="刷新预览">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
              <button @click="skipBookmark" class="p-1.5 bg-background/80 border border-border/60 rounded-md cursor-pointer transition-all text-muted-foreground hover:bg-primary/10 hover:border-primary/50 hover:text-primary" title="跳过当前书签">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 4l10 8-10 8V4z"></path>
                  <path d="M19 5v14"></path>
                </svg>
              </button>
              <button @click="deleteBookmark" class="p-1.5 bg-background/80 border border-border/60 rounded-md cursor-pointer transition-all text-muted-foreground hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive" title="删除书签">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
              <button @click="analyzeBookmark" class="p-1.5 bg-background/80 border border-border/60 rounded-md cursor-pointer transition-all duration-200 ease-in-out text-muted-foreground hover:bg-gradient-to-r hover:from-yellow-400/20 hover:to-amber-300/10 hover:border-yellow-400/70 hover:text-yellow-600 hover:shadow-sm hover:shadow-yellow-400/25 hover:scale-105 active:scale-95" :class="{ 'animate-pulse bg-yellow-400/10 border-yellow-400/50 text-yellow-600': isAnalyzing }" :title="isAnalyzing ? '分析中...' : 'AI分析'">
                <!-- AI分析图标 -->
                <svg v-if="!isAnalyzing" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path
                    d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
                  <path d="M20 2v4" />
                  <path d="M22 4h-4" />
                  <circle cx="4" cy="20" r="2" />
                </svg>

                <!-- 加载中的旋转图标 -->
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </button>

              <!-- 自动AI分析开关 -->
              <div class="flex items-center gap-2 px-2 py-1 bg-muted/50 border border-border/60 rounded-md">
                <span class="text-xs text-muted-foreground whitespace-nowrap">自动AI分析</span>
                <button
                  @click="autoAIAnalysis = !autoAIAnalysis"
                  class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-primary"
                  :class="autoAIAnalysis ? 'bg-primary' : 'bg-muted'"
                  :title="autoAIAnalysis ? '关闭自动AI分析' : '开启自动AI分析'"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    :class="autoAIAnalysis ? 'translate-x-5' : 'translate-x-0.5'"
                  />
                </button>
              </div>
            </div>
          </div>

          <!-- 分析状态显示 -->
          <div v-if="analysisStatus" class="px-5 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200/50">
            <div class="flex items-center gap-2 text-sm text-yellow-700">
              <span class="animate-spin rounded-full h-3 w-3 border-b border-yellow-600"></span>
              <span>{{ analysisStatus }}</span>
            </div>
          </div>
          <div class="flex-1 relative bg-background">
            <iframe 
              v-if="currentBookmark?.url"
              :key="iframeKey"
              :src="currentBookmark.url"
              class="w-full h-full border-0 bg-background"
              frameborder="0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              @error="handleIframeError"
              @load="handleIframeLoad"
            />
            <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted">
              <span class="text-muted-foreground text-sm">URL预览</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-card border border-border/60 rounded-xl p-5 shadow-sm flex flex-col max-h-full overflow-hidden">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-base font-semibold text-foreground m-0">选择空间</h3>
          <button @click="fetchSpaces" class="p-1.5 bg-background/80 border border-border/60 rounded-md cursor-pointer transition-all text-muted-foreground hover:bg-muted/50 hover:border-border/80 hover:text-foreground flex items-center justify-center" title="刷新空间列表">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5 overflow-y-auto pr-1 py-2">
          <button
            v-for="space in spacesWithVirtual"
            :key="space.id"
            class="flex flex-col items-center gap-2 px-3 py-4 bg-muted/40 border border-border/60 rounded-lg cursor-pointer transition-all hover:bg-primary/10 hover:border-primary hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10"
            :class="{
              'bg-gradient-to-r from-yellow-100/30 to-amber-100/20 border-yellow-300/50 shadow-sm shadow-yellow-300/20 hover:from-yellow-100/40 hover:to-amber-100/30 hover:border-yellow-400/60 hover:shadow-yellow-300/30': shouldHighlightSpace(space),
              'animate-pulse': shouldHighlightSpace(space) && space.isNew
            }"
            @click="assignToSpace(space.id)"
            :title="space.name + (space.isNew ? ' (新建)' : '')"
          >
            <!-- 虚拟命名空间的特殊图标 -->
            <div v-if="space.isNew" class="relative">
              <Icon name="folder-plus" :size="20" />
              <div class="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
            <Icon v-else-if="space.icon" :name="space.icon" :size="20" />
            <Icon v-else name="folder" :size="20" />

            <!-- 命名空间名称 -->
            <span class="text-sm font-medium text-foreground text-center break-words leading-tight">
              {{ space.name }}
            </span>

            <!-- 新建标记 -->
            <div v-if="space.isNew" class="text-xs text-yellow-600 font-medium bg-yellow-100/50 px-2 py-0.5 rounded-full">
              新建
            </div>
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center bg-card border border-border/60 rounded-xl text-muted-foreground text-base" v-else-if="!loading && bookmarks.length === 0">
      <p>没有找到游离的书签</p>
    </div>

    <div class="flex-1 flex items-center justify-center bg-card border border-border/60 rounded-xl text-muted-foreground text-base" v-else-if="loading">
      <p>加载中...</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch, onUnmounted } from 'vue'
import Icon from '@/components/Base/Icon.vue'
import { BookmarkAPI, SpaceAPI, TagAPI, WebsiteAnalysisAPI } from '@/services/api'
import type { BookmarkResp, SpaceRespSimple, TagResp, NewWebsiteAnalysisResponse } from '@/types/api'

// 扩展的空间类型，包含 isNew 属性
interface ExtendedSpace extends SpaceRespSimple {
  isNew?: boolean
}

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
const processedCount = ref(0)
const iframeKey = ref(0)
const availableTags = ref<TagResp[]>([])
const selectedTags = ref<string[]>([])
const selectedTagNames = ref<string[]>([])
const isTagDropdownOpen = ref(false)
const tagSearchQuery = ref('')
const filteredTags = ref<TagResp[]>([])
const tagSearchInput = ref<HTMLInputElement | null>(null)

// 流式分析相关状态
const isAnalyzing = ref(false)
const analysisStatus = ref('')
const isAnalysisAborted = ref(false)

// 存储完整的AI分析结果用于提交
const aiAnalysisSpaces = ref<string>('')
const aiAnalysisTags = ref<string[]>([])

// 虚拟命名空间相关状态
const virtualSpace = ref<{ id: string; name: string; isNew: boolean } | null>(null)

// 自动AI分析开关状态
const autoAIAnalysis = ref(false)

const progressPercentage = computed(() => {
  if (totalCount.value === 0) return 0
  return (processedCount.value / totalCount.value) * 100
})

// 计算包含虚拟命名空间的空间列表
const spacesWithVirtual = computed(() => {
  const allSpaces = [...spaces.value] as ExtendedSpace[]

  // 如果有虚拟命名空间，添加到列表开头
  if (virtualSpace.value) {
    allSpaces.unshift({
      id: virtualSpace.value.id,
      name: virtualSpace.value.name,
      icon: 'folder-plus',
      isNew: true
    })
  }

  return allSpaces
})

// 检查命名空间是否应该高亮
const shouldHighlightSpace = (space: ExtendedSpace) => {
  if (!currentBookmark.value) return false

  // 如果是虚拟命名空间且匹配当前选择
  if (virtualSpace.value && virtualSpace.value.id === space.id) {
    return true
  }

  // 如果是现有命名空间且匹配当前选择
  if (currentBookmark.value.namespaceId === space.id) {
    return true
  }

  return false
}

// 获取标签颜色的辅助函数
const getTagColor = (tagName: string): string => {
  const tag = availableTags.value.find(t => t.name === tagName)
  return tag ? tag.color : '#6b7280'
}

// 监听当前书签变化，同步标签选择
watch(currentBookmark, (newBookmark) => {
  if (newBookmark && newBookmark.tags) {
    selectedTags.value = newBookmark.tags.map(tag => tag.id)
    selectedTagNames.value = newBookmark.tags.map(tag => tag.name)
  } else {
    selectedTags.value = []
    selectedTagNames.value = []
  }

  // 清除虚拟命名空间
  virtualSpace.value = null
}, { immediate: true })

const fetchBookmarksWithoutSpace = async () => {
  try {
    loading.value = true
    const response = await BookmarkAPI.noSpaceBookmark()
    bookmarks.value = response.data
    totalCount.value = bookmarks.value.length
    processedCount.value = 0
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

const fetchTags = async () => {
  try {
    const response = await TagAPI.getAllList()
    availableTags.value = response.data
    filteredTags.value = response.data // 初始化过滤标签
  } catch (error) {
    console.error('Failed to fetch tags:', error)
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

    // 如果开启了自动AI分析，自动触发分析
    if (autoAIAnalysis.value) {
      setTimeout(() => {
        analyzeBookmark()
      }, 500) // 延迟500ms触发，让界面先更新
    }
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

    // 如果开启了自动AI分析，自动触发分析
    if (autoAIAnalysis.value) {
      setTimeout(() => {
        analyzeBookmark()
      }, 500) // 延迟500ms触发，让界面先更新
    }
  } catch (error) {
    console.error('Failed to update bookmark description:', error)
    cancelEditDescription()
  }
}

const cancelEditDescription = () => {
  isEditingDescription.value = false
  editedDescription.value = ''
}

// 处理标签变化
const handleTagsChange = async (newTagNames: string[]) => {
  if (!currentBookmark.value) return

  // 根据标签名称找到对应的标签 ID
  const newTagIds = newTagNames.map(name => {
    const existingTag = availableTags.value.find(tag => tag.name === name)
    return existingTag ? existingTag.id : name // 如果找不到，暂时用名称代替
  })

  selectedTags.value = newTagIds

  try {
    await BookmarkAPI.update({
      id: currentBookmark.value.id,
      tags: newTagIds
    })

    // 更新本地书签的标签信息
    if (currentBookmark.value) {
      currentBookmark.value.tags = availableTags.value.filter(tag => newTagIds.includes(tag.id))
    }

    // 如果开启了自动AI分析，自动触发分析
    if (autoAIAnalysis.value) {
      setTimeout(() => {
        analyzeBookmark()
      }, 500) // 延迟500ms触发，让界面先更新
    }
  } catch (error) {
    console.error('Failed to update bookmark tags:', error)
  }
}

// 切换下拉菜单
const toggleTagDropdown = () => {
  isTagDropdownOpen.value = !isTagDropdownOpen.value
  if (isTagDropdownOpen.value) {
    // 打开时重置搜索和过滤
    tagSearchQuery.value = ''
    filteredTags.value = availableTags.value
    // 延迟聚焦到搜索框
    nextTick(() => {
      tagSearchInput.value?.focus()
    })
  }
}

// 过滤标签
const filterTags = () => {
  const query = tagSearchQuery.value.toLowerCase().trim()
  if (!query) {
    filteredTags.value = availableTags.value
  } else {
    filteredTags.value = availableTags.value.filter(tag =>
      tag.name.toLowerCase().includes(query)
    )
  }
}

// 切换标签选择
const toggleTagSelection = (tag: TagResp) => {
  const isSelected = selectedTagNames.value.includes(tag.name)
  
  if (isSelected) {
    // 取消选择
    selectedTagNames.value = selectedTagNames.value.filter(name => name !== tag.name)
  } else {
    // 添加选择
    selectedTagNames.value.push(tag.name)
  }
  
  handleTagsChange(selectedTagNames.value)
}

// 移除标签
const removeTag = (tagName: string) => {
  selectedTagNames.value = selectedTagNames.value.filter(name => name !== tagName)
  handleTagsChange(selectedTagNames.value)
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

    // 添加标签信息
    if (selectedTags.value.length > 0) {
      updateData.tags = selectedTags.value
    }

    // 检查是否包含新的空间或标签
    const hasNewSpace = isNewMarkerId(spaceId)
    const hasNewTags = selectedTags.value.some(tagId => isNewMarkerId(tagId))

    // 如果有新空间，提取新空间数据
    if (hasNewSpace) {
      const spaceName = extractDisplayName(spaceId)
      updateData.newSpace = { name: spaceName }
      // 从 namespaceId 中移除，因为已经有了 newSpace
      delete updateData.namespaceId
    }

    // 如果有新标签，提取新标签数据
    if (hasNewTags) {
      const newTags = selectedTags.value
        .filter(tagId => isNewMarkerId(tagId))
        .map(tagId => {
          const { name, color } = parseTagString(tagId)
          return { name, color }
        })
      updateData.newTags = newTags

      // 从 tags 中移除新标签，只保留现有标签ID
      updateData.tags = selectedTags.value.filter(tagId => !isNewMarkerId(tagId))
    }

    await BookmarkAPI.update(updateData)

    bookmarks.value = bookmarks.value.filter(b => b.id !== currentBookmark.value!.id)
    processedCount.value++

    // 清除虚拟命名空间
    virtualSpace.value = null

    // 如果包含新的空间或标签，刷新相关列表
    if (hasNewSpace || hasNewTags) {
      console.log('检测到新项目，刷新空间和标签列表...')
      await Promise.all([
        fetchSpaces(),
        fetchTags()
      ])
    }

    if (bookmarks.value.length > 0) {
      // 保持当前索引，如果超出范围则调整到最后一个
      if (currentIndex.value >= bookmarks.value.length) {
        currentIndex.value = bookmarks.value.length - 1
      }
      currentBookmark.value = bookmarks.value[currentIndex.value]
      editedName.value = ''
      isEditingName.value = false
      editedDescription.value = ''
      isEditingDescription.value = false
      iframeKey.value++

      // 如果开启了自动AI分析，自动对下一个书签进行分析
      if (autoAIAnalysis.value && currentBookmark.value) {
        setTimeout(() => {
          analyzeBookmark()
        }, 800) // 延迟800ms触发，让界面先更新
      }
    } else {
      currentBookmark.value = null
      currentIndex.value = 0
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

const skipBookmark = () => {
  if (!currentBookmark.value || bookmarks.value.length === 0) return
  
  // 将当前书签移动到数组末尾
  const currentBookmarkData = bookmarks.value[currentIndex.value]
  bookmarks.value.splice(currentIndex.value, 1)
  bookmarks.value.push(currentBookmarkData)
  
  // 如果没有更多书签在当前位置之前，回到第一个
  if (currentIndex.value >= bookmarks.value.length) {
    currentIndex.value = 0
  }
  
  // 更新当前书签为同一位置的新书签（如果存在）
  if (bookmarks.value.length > 0) {
    currentBookmark.value = bookmarks.value[currentIndex.value]
  } else {
    currentBookmark.value = null
  }
  
  editedName.value = ''
  isEditingName.value = false
  editedDescription.value = ''
  isEditingDescription.value = false
  iframeKey.value++
}

const deleteBookmark = async () => {
  if (!currentBookmark.value) return
  
  try {
    await BookmarkAPI.delete(currentBookmark.value.id)
    
    bookmarks.value = bookmarks.value.filter(b => b.id !== currentBookmark.value!.id)
    processedCount.value++
    
    if (bookmarks.value.length > 0) {
      // 保持当前索引，如果超出范围则调整到最后一个
      if (currentIndex.value >= bookmarks.value.length) {
        currentIndex.value = bookmarks.value.length - 1
      }
      currentBookmark.value = bookmarks.value[currentIndex.value]
      editedName.value = ''
      isEditingName.value = false
      editedDescription.value = ''
      isEditingDescription.value = false
      iframeKey.value++
    } else {
      currentBookmark.value = null
      currentIndex.value = 0
    }
  } catch (error) {
    console.error('Failed to delete bookmark:', error)
  }
}

const handleIframeError = () => {
  console.warn('Failed to load URL preview for:', currentBookmark.value?.url)
}

// 检查是否为内网地址
const isInternalUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    const hostname = urlObj.hostname.toLowerCase()

    // 检查是否为localhost或本地IP
    const internalPatterns = [
      /^localhost(\:\d+)?$/,
      /^127\.0\.0\.1(\:\d+)?$/,
      /^0\.0\.0\.0(\:\d+)?$/,
      /^::1(\:\d+)?$/,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^169\.254\./,
      /^100\./,
      /^30\./
    ]

    return internalPatterns.some(pattern => pattern.test(hostname))
  } catch {
    return false
  }
}

// 检查是否为有效的网站URL
const isValidWebsiteUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)

    // 检查协议是否为http或https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false
    }

    // 检查hostname是否有效
    const hostname = urlObj.hostname
    if (!hostname || hostname.includes('..') || hostname.includes('//')) {
      return false
    }

    // 检查是否为常见的网站域名格式
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
    return domainPattern.test(hostname)
  } catch {
    return false
  }
}

// 解析标签字符串，提取名称和颜色
const parseTagString = (tagStr: string): { name: string; color: string; isNew: boolean } => {
  const parts = tagStr.split(':')
  const name = parts[0] || ''
  const isNew = parts[1] === 'new'
  const color = parts[2] || '#3b82f6'

  return { name, color, isNew }
}

// 检查ID是否为new标记的标识符
const isNewMarkerId = (id: string): boolean => {
  return id.includes(':new')
}

// 提取新项目的显示名称
const extractDisplayName = (fullId: string): string => {
  if (isNewMarkerId(fullId)) {
    const parts = fullId.split(':')
    return parts[0]?.trim() || fullId
  }
  return fullId
}

// 处理流式分析结果
const processAnalysisResult = async (analysisData: NewWebsiteAnalysisResponse) => {
  if (!currentBookmark.value) return

  // 存储分析结果用于提交
  aiAnalysisSpaces.value = analysisData.spaces || ''
  aiAnalysisTags.value = analysisData.tags || []

  // 获取当前所有的空间和标签
  const [spacesResponse, tagsResponse] = await Promise.all([
    SpaceAPI.getAllList(),
    TagAPI.getAllList()
  ])

  const spacesData = spacesResponse as any
  const tagsData = tagsResponse as any

  const allSpaces = spacesData?.data?.records || spacesData?.data || []
  const allTags = tagsData?.data || []

  // 处理基本信息填充 - AI分析结果总是覆盖表单值
  if (analysisData.name) {
    currentBookmark.value.name = analysisData.name
    editedName.value = analysisData.name
  }
  if (analysisData.description) {
    currentBookmark.value.description = analysisData.description
    editedDescription.value = analysisData.description
  }

  // 分析完成后显示一个简短的成功提示
  setTimeout(() => {
    console.log('AI分析完成，结果已应用到书签')
  }, 100)

  // 处理空间匹配，包括new标记的空间
  if (analysisData.spaces && analysisData.spaces.trim()) {
    const spaceParts = analysisData.spaces.split(':')
    const spaceName = spaceParts[0]?.trim()
    const isSpaceNew = spaceParts[1] === 'new'

    if (spaceName) {
      const matchedSpace = allSpaces.find((s: SpaceRespSimple) =>
        s.name.toLowerCase() === spaceName.toLowerCase()
      )

      if (matchedSpace) {
        currentBookmark.value.namespaceId = matchedSpace.id
      } else if (isSpaceNew) {
        // 新空间，使用完整标识符作为ID，名称部分作为显示名称
        currentBookmark.value.namespaceId = analysisData.spaces

        // 创建虚拟命名空间
        virtualSpace.value = {
          id: analysisData.spaces,
          name: spaceName,
          isNew: true
        }
      }
    }
  } else {
    // 清除虚拟命名空间
    virtualSpace.value = null
  }

  // 处理标签匹配，包括new标记的标签
  if (analysisData.tags && Array.isArray(analysisData.tags) && analysisData.tags.length > 0) {
    // 保留当前已选择的标签
    const finalSelectedTagIds = new Set<string>(selectedTags.value)
    const finalSelectedTagNames = new Set<string>(selectedTagNames.value)

    for (const tagStr of analysisData.tags) {
      if (tagStr && tagStr.trim()) {
        const { name: tagName, isNew } = parseTagString(tagStr)

        if (tagName) {
          const matchedTag = allTags.find((t: TagResp) =>
            t.name.toLowerCase() === tagName.toLowerCase()
          )

          if (matchedTag) {
            finalSelectedTagIds.add(matchedTag.id)
            finalSelectedTagNames.add(matchedTag.name)
          } else if (isNew) {
            // 新标签，使用完整标识符作为ID
            finalSelectedTagIds.add(tagStr)
            finalSelectedTagNames.add(tagName)
          }
        }
      }
    }

    // 设置已匹配的标签，保留现有选择
    selectedTags.value = Array.from(finalSelectedTagIds)
    selectedTagNames.value = Array.from(finalSelectedTagNames)
  }

  // AI分析完成，直接应用到输入框，无需确认对话框
}

// AI 智能分析（流式版本，支持认证）
const analyzeBookmark = async () => {
  if (!currentBookmark.value) return

  // 如果已经在分析中，不重复触发
  if (isAnalyzing.value) {
    console.log('AI分析正在进行中，跳过重复触发')
    return
  }

  const url = currentBookmark.value.url

  if (!url) {
    alert('书签URL为空')
    return
  }

  // 检查是否为内网地址
  if (isInternalUrl(url)) {
    alert('不支持分析内网地址')
    return
  }

  // 检查是否为有效的网站URL
  if (!isValidWebsiteUrl(url)) {
    alert('请输入有效的网站网址')
    return
  }

  // 清空已选择的空间和标签，为AI分析结果做准备
  if (currentBookmark.value) {
    currentBookmark.value.namespaceId = ''
    selectedTags.value = []
    selectedTagNames.value = []
  }

  // 清除虚拟命名空间
  virtualSpace.value = null

  // 如果已经在分析中，标记为中止
  if (isAnalyzing.value) {
    isAnalysisAborted.value = true
    isAnalyzing.value = false
    analysisStatus.value = ''
    return
  }

  try {
    isAnalyzing.value = true
    isAnalysisAborted.value = false
    analysisStatus.value = '正在连接分析服务...'

    // 使用fetch实现SSE，支持认证
    await WebsiteAnalysisAPI.analyzeWebsiteStream(
      url,
      // onStatus
      (message: string) => {
        if (!isAnalysisAborted.value) {
          analysisStatus.value = message
        }
      },
      // onBasicInfo
      (data: any) => {
        if (!isAnalysisAborted.value && currentBookmark.value) {
          // 立即填充网站基本信息，提升用户体验 - AI分析结果总是覆盖表单值
          if (data.name) {
            currentBookmark.value.name = data.name
            editedName.value = data.name
          }
          if (data.description) {
            currentBookmark.value.description = data.description
            editedDescription.value = data.description
          }
        }
      },
      // onResult
      async (data: any) => {
        if (!isAnalysisAborted.value) {
          analysisStatus.value = '分析完成，正在处理结果...'

          // 处理完整的分析结果
          await processAnalysisResult(data)

          // 清理状态
          analysisStatus.value = ''
          isAnalyzing.value = false
        }
      },
      // onError
      (message: string) => {
        console.error('分析错误:', message)
        if (!isAnalysisAborted.value) {
          alert(message || '分析过程中发生错误')

          // 清理状态
          analysisStatus.value = ''
          isAnalyzing.value = false
        }
      }
    )

  } catch (error: any) {
    console.error('启动分析失败:', error)
    if (!isAnalysisAborted.value) {
      alert(error?.message || '启动分析失败，请稍后重试')
    }

    // 清理状态
    analysisStatus.value = ''
    isAnalyzing.value = false
  }
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.tag-dropdown-container')) {
    isTagDropdownOpen.value = false
  }
}

onMounted(() => {
  fetchBookmarksWithoutSpace()
  fetchSpaces()
  fetchTags()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>