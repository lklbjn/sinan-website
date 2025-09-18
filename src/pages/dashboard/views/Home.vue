<template>
  <div class="flex flex-1 flex-col gap-6 p-4 pt-0">
    <!-- Welcome Section -->
    <div class="rounded-lg border p-6 relative">
      <div class="flex items-start justify-between mb-2">
        <h1 class="text-3xl font-bold">Welcome back!</h1>
        <div class="flex items-center gap-1">
          <ContextMenu>
            <ContextMenuTrigger as-child>
              <button
                  @click="handleRefresh"
                  :class="['p-2 rounded-md hover:bg-muted transition-colors', isRefreshing && 'animate-spin']"
                  :disabled="isRefreshing"
                  title="刷新书签"
              >
                <RefreshCw class="h-5 w-5"/>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent class="w-48">
              <ContextMenuItem @click="showFaviconReloadDialog = true" class="flex items-center">
                <Settings class="mr-2 h-4 w-4"/>
                <span>重新加载所有图标</span>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          
          <button
              @click="checkDuplicateBookmarks"
              class="p-2 rounded-md hover:bg-muted transition-colors"
              title="检查重复书签"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>
          </button>
        </div>
      </div>
      <p class="text-muted-foreground mb-6">你从哪个应用开始以下是你最常用的应用</p>

      <!-- Search Bar -->
      <div class="flex gap-2 mb-6">
        <div class="relative flex-1">
          <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索书签名称、网址、描述或标签..."
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <!-- 搜索状态指示器 -->
          <div v-if="isSearching" class="absolute right-2 top-1/2 -translate-y-1/2">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        </div>
        <button
            @click="showAddBookmarkModal = true"
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
        >
          添加书签
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- App Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        <ContextMenu v-for="bookmark in filteredBookmarks" :key="bookmark.id">
          <ContextMenuTrigger as-child>
            <div
                @click="openBookmark(bookmark.url, bookmark.id)"
                :class="[
                'flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground transition-all cursor-pointer',
                bookmark.star 
                  ? 'shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] border-amber-200/50' 
                  : 'shadow-sm hover:shadow-md'
              ]"
            >
              <div class="flex h-8 w-8 items-center justify-center rounded-md bg-muted overflow-hidden">
                <!-- 优先使用存储的图标（HTTP URL 或 base64） -->
                <img
                    v-if="isValidIcon(bookmark.icon)"
                    :src="String(bookmark.icon)"
                    :alt="bookmark.name"
                    class="h-full w-full object-cover"
                    @error="(e) => (e.target as HTMLImageElement).src = '/icon.png'"
                />
                <!-- 其次使用Google Favicon服务，失败时降级到Sinan API -->
                <img
                    v-else-if="getFaviconUrl(bookmark.url)"
                    :src="getFaviconUrl(bookmark.url)"
                    :alt="bookmark.name"
                    class="h-full w-full object-cover"
                    @error="(e) => onFaviconError(e, bookmark.url)"
                />
                <!-- 默认使用项目Logo -->
                <img
                    v-else
                    src="/icon.png"
                    :alt="bookmark.name"
                    class="h-full w-full object-cover"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ bookmark.name }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ bookmark.url }}</p>
              </div>
              <!-- 标签颜色指示器 -->
              <div v-if="bookmark.tags && bookmark.tags.length > 0" class="flex items-center -space-x-2 flex-shrink-0">
                <div
                    v-for="(tag, index) in bookmark.tags.slice(0, 3)"
                    :key="tag.id"
                    class="h-4 w-4 rounded-full border-2 border-white dark:border-gray-800"
                    :style="{ backgroundColor: tag.color || '#52525b', zIndex: bookmark.tags.length - index }"
                    :title="tag.name"
                />
                <div
                    v-if="bookmark.tags.length > 3"
                    class="h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 bg-gray-400 flex items-center justify-center"
                    :title="`还有 ${bookmark.tags.length - 3} 个标签`"
                >
                  <span class="text-[8px] text-white font-semibold">+{{ bookmark.tags.length - 3 }}</span>
                </div>
              </div>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent class="w-64">
            <ContextMenuItem @click="toggleBookmarkStar(bookmark)" class="flex items-center">
              <Star
                  :class="['mr-2 h-4 w-4', bookmark.star ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground']"/>
              <span>{{ bookmark.star ? '取消星标' : '添加星标' }}</span>
            </ContextMenuItem>
            <ContextMenuItem @click="editBookmark(bookmark)" class="flex items-center">
              <Edit class="mr-2 h-4 w-4 text-muted-foreground"/>
              <span>编辑书签</span>
            </ContextMenuItem>
            <ContextMenuSeparator/>
            <!-- 标签选择区域 -->
            <div class="px-2 py-2">
              <div class="flex items-center gap-2 mb-2">
                <Tag class="h-4 w-4 text-muted-foreground"/>
                <span class="text-sm font-medium">标签</span>
              </div>
              <div v-if="availableTags.length === 0" class="text-sm text-muted-foreground">
                暂无可用标签
              </div>
              <div v-else class="flex flex-wrap gap-1">
                <button
                    v-for="tag in availableTags"
                    :key="tag.id"
                    @pointerdown.stop.prevent="handleTagToggle(bookmark, tag.id, $event)"
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
                      bookmark.tags?.some(t => t.id === tag.id)
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-muted hover:bg-muted/80 border border-transparent'
                    ]"
                >
                  <div
                      class="w-2 h-2 rounded-full"
                      :style="{ backgroundColor: tag.color || '#52525b' }"
                  />
                  <span>{{ tag.name }}</span>
                  <Check
                      v-if="bookmark.tags?.some(t => t.id === tag.id)"
                      class="h-3 w-3 ml-0.5"
                  />
                </button>
              </div>
            </div>
            <ContextMenuSeparator/>
            <ContextMenuItem @click="confirmDeleteBookmark(bookmark.id)" class="flex items-center text-red-600">
              <Trash2 class="mr-2 h-4 w-4"/>
              <span>删除书签</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <!-- Empty State -->
        <div v-if="filteredBookmarks.length === 0"
             class="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
          <svg class="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
          </svg>
          <p>{{ searchQuery ? '没有找到匹配的书签' : '暂无常用书签' }}</p>
          <p class="text-sm">{{ searchQuery ? '请尝试其他搜索词' : '添加一些书签开始使用吧' }}</p>
        </div>
      </div>
    </div>


    <!-- 添加书签弹窗 -->
    <AddBookmarkModal
        v-model:open="showAddBookmarkModal"
        @success="handleBookmarkAdded"
    />

    <!-- 编辑书签弹窗 -->
    <EditBookmarkDialog
        v-model:open="showEditDialog"
        :bookmark="editingBookmark"
        @success="handleBookmarkUpdated"
    />

    <!-- 删除确认对话框 -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            您确定要删除这个书签吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction @click="deleteBookmark" class="bg-red-600 hover:bg-red-700">
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>

  <!-- 重新加载图标确认对话框 -->
  <Dialog v-model:open="showFaviconReloadDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>重新加载书签图标</DialogTitle>
        <DialogDescription>
          确定要重新加载所有书签的图标吗？您可以选择是否强制刷新图标。
        </DialogDescription>
      </DialogHeader>
      
      <div class="flex items-center space-x-2 py-4">
        <input
          id="force-reload"
          type="checkbox"
          v-model="forceReloadFavicon"
          class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label for="force-reload" class="text-sm font-medium leading-none">
          强制刷新（重新下载所有图标）
        </label>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="showFaviconReloadDialog = false">
          取消
        </Button>
        <Button @click="reloadAllFavicons" :disabled="isReloadingFavicons">
          <RefreshCw class="h-4 w-4 mr-2 animate-spin" v-if="isReloadingFavicons" />
          {{ isReloadingFavicons ? '正在重新加载...' : '确认重新加载' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 重复书签检查模态框 -->
  <div v-if="showDuplicateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-background rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      <div class="p-6 border-b border-border/40 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-foreground">重复书签检查</h3>
        <button @click="closeDuplicateModal" class="p-1.5 hover:bg-muted rounded-md transition-colors">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="duplicateLoading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span class="ml-3 text-muted-foreground">正在检查重复书签...</span>
        </div>
        
        <div v-else-if="duplicateBookmarks.size === 0" class="text-center py-8 text-muted-foreground">
          未发现重复书签
        </div>
        
        <div v-else class="space-y-6">
          <div v-for="[domain, bookmarks] in duplicateBookmarks" :key="domain" class="border border-border/40 rounded-lg overflow-hidden">
            <div class="bg-muted/30 px-4 py-3 border-b border-border/40">
              <h4 class="font-medium text-foreground">{{ domain }}</h4>
              <p class="text-sm text-muted-foreground mt-1">发现 {{ bookmarks.length }} 个重复书签</p>
            </div>
            
            <div class="divide-y divide-border/40">
              <div v-for="bookmark in bookmarks" :key="bookmark.id" class="p-4 flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <!-- 编辑状态下的名称输入框 -->
                  <div v-if="editingBookmarks[bookmark.id]" class="mb-2">
                    <input
                      v-model="editingBookmarks[bookmark.id].name"
                      type="text"
                      placeholder="书签名称"
                      class="w-full px-3 py-1 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <!-- 正常状态下的名称显示 -->
                  <h5 v-else class="font-medium text-foreground truncate">{{ bookmark.name }}</h5>
                  
                  <!-- 编辑状态下的URL输入框 -->
                  <div v-if="editingBookmarks[bookmark.id]" class="mb-2">
                    <input
                      v-model="editingBookmarks[bookmark.id].url"
                      type="text"
                      placeholder="书签URL"
                      class="w-full px-3 py-1 text-sm border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <!-- 正常状态下的URL显示 -->
                  <p v-else class="text-sm text-muted-foreground truncate mt-1">{{ bookmark.url }}</p>
                  
                  <p v-if="bookmark.description" class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ bookmark.description }}</p>
                  
                  <!-- 标签展示 -->
                  <div v-if="bookmark.tags && bookmark.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                    <span
                      v-for="tag in bookmark.tags"
                      :key="tag.id"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors"
                      :style="{ 
                        backgroundColor: tag.color ? `${tag.color}20` : 'rgba(82, 82, 91, 0.1)',
                        borderColor: tag.color ? `${tag.color}40` : 'rgba(82, 82, 91, 0.2)',
                        color: tag.color ? tag.color : '#52525b'
                      }"
                    >
                      <div
                        class="w-2 h-2 rounded-full"
                        :style="{ backgroundColor: tag.color || '#52525b' }"
                      />
                      {{ tag.name }}
                    </span>
                  </div>
                </div>
                
                <div class="flex items-center gap-2 ml-4">
                  <a :href="bookmark.url" target="_blank" class="p-2 hover:bg-muted rounded-md transition-colors" title="打开书签">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                  
                  <button @click="ignoreDuplicateBookmark(bookmark.id)" class="p-2 hover:bg-primary/10 text-primary rounded-md transition-colors" title="忽略重复检查">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  </button>
                  
                  <button 
                    v-if="!editingBookmarks[bookmark.id]"
                    @click="startEditing(bookmark)" 
                    class="p-2 hover:bg-blue-500/10 text-blue-500 rounded-md transition-colors" 
                    title="修改书签"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  
                  <button 
                    v-if="editingBookmarks[bookmark.id]"
                    @click="saveBookmarkEdit(bookmark.id)" 
                    class="p-2 hover:bg-green-500/10 text-green-500 rounded-md transition-colors" 
                    title="保存修改"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                  </button>
                  
                  <button @click="deleteDuplicateBookmark(bookmark.id)" class="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors" title="删除书签">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="p-6 border-t border-border/40 flex justify-end">
        <button @click="closeDuplicateModal" class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, computed, watch} from 'vue'
import {BookmarkAPI, TagAPI} from '@/services/api'
import type {BookmarkResp, TagResp} from '@/types/api'
import AddBookmarkModal from '@/components/Bookmark/AddBookmarkModal.vue'
import EditBookmarkDialog from '@/components/Bookmark/EditBookmarkDialog.vue'
import { useFavicon } from '@/composables/useFavicon'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Edit, Trash2, Star, RefreshCw, Tag, Check, Settings} from 'lucide-vue-next'

// 响应式数据
const mostVisitedBookmarks = ref<BookmarkResp[]>([])
const searchResults = ref<BookmarkResp[]>([])
const searchQuery = ref('')
const loading = ref(false)
const isRefreshing = ref(false)
const isSearching = ref(false)
const showAddBookmarkModal = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const deletingBookmarkId = ref<string | null>(null)
const availableTags = ref<TagResp[]>([])
const editingBookmark = ref<BookmarkResp | null>(null)

// 分页状态 - 最常访问书签
const pageSize = ref(40) // 显示更多书签以便搜索
const totalCount = ref(0)
const totalPages = ref(0)

// 重新加载图标相关状态
const showFaviconReloadDialog = ref(false)
const forceReloadFavicon = ref(false)
const isReloadingFavicons = ref(false)

// 重复书签检查相关状态
const duplicateBookmarks = ref<Map<string, any[]>>(new Map())
const showDuplicateModal = ref(false)
const duplicateLoading = ref(false)

// 编辑书签相关状态
const editingBookmarks = ref<Record<string, { name: string; url: string }>>({})

// 计算属性 - 显示的书签（搜索时显示搜索结果，否则显示常用书签）
const filteredBookmarks = computed(() => {
  return searchQuery.value.trim() ? searchResults.value : mostVisitedBookmarks.value
})

// 搜索书签
const searchBookmarks = async (query: string) => {
  if (!query.trim()) {
    searchResults.value = []
    return
  }

  try {
    isSearching.value = true
    const response = await BookmarkAPI.getMostVisited({
      search: query.trim(),
      limit: pageSize.value
    }) as any

    if (response?.flag) {
      searchResults.value = response.data || []
    } else {
      searchResults.value = []
    }
  } catch (error) {
    console.error('Search failed:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 防抖搜索
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const debounceSearch = (query: string) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    searchBookmarks(query)
  }, 300) // 300ms 防抖延迟
}

// 监听搜索输入
watch(searchQuery, (newQuery) => {
  debounceSearch(newQuery)
}, {immediate: false})

// 使用favicon组合式函数
const { getFaviconUrl } = useFavicon()

// 处理favicon加载错误
const onFaviconError = (event: Event, url: string) => {
  const img = event.target as HTMLImageElement
  const currentSrc = img.src
  
  // 如果当前使用的是Google服务
  if (currentSrc.includes('google.com/s2/favicons')) {
    console.log(`Google favicon failed for ${url}, trying Sinan API`)
    // 切换到Sinan API
    img.src = `/api/favicon/icon?domain=${encodeURIComponent(new URL(url).hostname)}&sz=32`
  } else {
    // 如果Sinan API也失败了，使用默认图标
    console.log(`Sinan API also failed for ${url}, using default icon`)
    img.src = '/icon.png'
  }
}

// 判断图标是否为base64格式
// 判断是否为有效的图标（HTTP URL 或 base64）
const isValidIcon = (icon: number | string): boolean => {
  if (typeof icon !== 'string') return false
  // 检查是否为 HTTP/HTTPS URL
  if (icon.startsWith('http://') || icon.startsWith('https://')) return true
  // 检查是否为 base64 图片
  if (icon.startsWith('data:image/')) return true
  return false
}

// 获取最常访问的书签
const fetchMostVisited = async () => {
  try {
    loading.value = true
    console.log('正在获取最常访问的书签...')
    const response = await BookmarkAPI.getMostVisited({limit: pageSize.value}) as any
    console.log('getMostVisited response:', response)
    if (response?.flag) {
      mostVisitedBookmarks.value = response.data || []
      console.log('成功获取书签:', (response.data || []).length, '个')
      // 注意：getMostVisited API 不返回分页信息，只返回指定数量的记录
      totalCount.value = response.data?.length || 0
      totalPages.value = 1 // 该API不支持分页，只有一页
    } else {
      console.warn('API调用成功但flag为false:', response?.message)
      mostVisitedBookmarks.value = []
      totalCount.value = 0
      totalPages.value = 0
    }
  } catch (error) {
    console.error('Failed to fetch most visited bookmarks:', error)
    mostVisitedBookmarks.value = []
    totalCount.value = 0
    totalPages.value = 0
  } finally {
    loading.value = false
  }
}


// 打开书签
const openBookmark = async (url: string, bookmarkId?: string) => {
  // 如果有书签ID，调用增加使用次数接口
  if (bookmarkId) {
    try {
      await BookmarkAPI.incrementUsage(bookmarkId)
    } catch (error) {
      console.error('记录书签使用失败:', error)
      // 即使记录失败，仍然打开书签
    }
  }

  window.open(url, '_blank')
}

// 处理书签添加成功
const handleBookmarkAdded = () => {
  // 重新获取最常访问的书签以显示新添加的书签
  fetchMostVisited()
}

// 处理书签更新成功
const handleBookmarkUpdated = (updatedBookmark: BookmarkResp) => {
  // 立即更新本地数据
  if (updatedBookmark) {
    // 更新最常访问列表中的书签
    const index = mostVisitedBookmarks.value.findIndex(b => b.id === updatedBookmark.id)
    if (index !== -1) {
      mostVisitedBookmarks.value[index] = { ...mostVisitedBookmarks.value[index], ...updatedBookmark }
    }
    
    // 更新搜索结果列表中的书签
    const searchIndex = searchResults.value.findIndex(b => b.id === updatedBookmark.id)
    if (searchIndex !== -1) {
      searchResults.value[searchIndex] = { ...searchResults.value[searchIndex], ...updatedBookmark }
    }
  }
  
  // 可选：重新获取数据以确保完全同步
  fetchMostVisited()
  editingBookmark.value = null
}

// 获取所有标签
const fetchTags = async () => {
  try {
    const response = await TagAPI.getAllList()
    console.log('Tags response:', response)
    availableTags.value = response.data || []
  } catch (error) {
    console.error('Failed to fetch tags:', error)
  }
}

// 编辑书签
const editBookmark = async (bookmark: BookmarkResp) => {
  try {
    // 获取完整的书签信息，包含所有标签
    const response = await BookmarkAPI.getBookmarkById(bookmark.id) as any
    if (response?.flag && response?.data) {
      editingBookmark.value = response.data
      showEditDialog.value = true
    } else {
      console.error('Failed to fetch bookmark details')
    }
  } catch (error) {
    console.error('Failed to fetch bookmark for editing:', error)
  }
}

// 显示删除确认对话框
const confirmDeleteBookmark = (id: string) => {
  deletingBookmarkId.value = id
  showDeleteDialog.value = true
}

// 删除书签
const deleteBookmark = async () => {
  if (!deletingBookmarkId.value) return

  try {
    const response = await BookmarkAPI.delete(deletingBookmarkId.value) as any
    if (response?.flag) {
      // 从所有列表中移除已删除的书签
      mostVisitedBookmarks.value = mostVisitedBookmarks.value.filter(b => b.id !== deletingBookmarkId.value)
      searchResults.value = searchResults.value.filter(b => b.id !== deletingBookmarkId.value)
    }
  } catch (error) {
    console.error('Failed to delete bookmark:', error)
  } finally {
    showDeleteDialog.value = false
    deletingBookmarkId.value = null
  }
}

// 切换书签星标状态
const toggleBookmarkStar = async (bookmark: BookmarkResp) => {
  try {
    const response = await BookmarkAPI.toggleStar(bookmark.id) as any
    if (response?.flag || response?.code === 0) {
      // 重新加载书签数据以获取最新状态
      await fetchMostVisited()
      // 如果当前在搜索状态，也要更新搜索结果
      if (searchQuery.value.trim()) {
        await searchBookmarks(searchQuery.value.trim())
      }
    }
  } catch (error) {
    console.error('Failed to toggle bookmark star:', error)
  }
}

// 刷新数据
const handleRefresh = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([
      fetchMostVisited(),
      fetchTags()
    ])
  } finally {
    isRefreshing.value = false
  }
}

// 重新加载所有书签图标
const reloadAllFavicons = async () => {
  try {
    isReloadingFavicons.value = true
    const response = await BookmarkAPI.reloadAll(forceReloadFavicon.value)
    
    if (response.code === 0) {
      // 重新加载成功，可以给用户提示
      console.log('书签图标重新加载成功')
      // 这里可以添加成功提示
    } else {
      console.error('重新加载书签图标失败:', response.message)
      // 这里可以添加错误提示
    }
  } catch (error) {
    console.error('重新加载书签图标时出错:', error)
  } finally {
    isReloadingFavicons.value = false
    showFaviconReloadDialog.value = false
    forceReloadFavicon.value = false
  }
}

// 切换书签标签
// 处理标签切换（防止菜单关闭）
const handleTagToggle = async (bookmark: BookmarkResp, tagId: string, event: Event) => {
  event.stopPropagation()
  event.preventDefault()

  try {
    const currentTagIds = bookmark.tags
        ?.map(t => t.id)
        ?.filter(id => id != null && id !== '') || []

    let newTagIds: string[]
    const isTagSelected = currentTagIds.includes(tagId)

    if (isTagSelected) {
      newTagIds = currentTagIds.filter(id => id !== tagId)
    } else {
      newTagIds = [...currentTagIds, tagId]
    }

    // 立即更新本地数据（包括搜索结果）
    const updateBookmarkInList = (list: BookmarkResp[], bookmarkId: string) => {
      const bookmarkIndex = list.findIndex(b => b.id === bookmarkId)
      if (bookmarkIndex !== -1) {
        const targetTag = availableTags.value.find(t => t.id === tagId)
        if (targetTag) {
          if (isTagSelected) {
            // 移除标签
            list[bookmarkIndex].tags = list[bookmarkIndex].tags?.filter(t => t.id !== tagId) || []
          } else {
            // 添加标签
            if (!list[bookmarkIndex].tags) {
              list[bookmarkIndex].tags = []
            }
            list[bookmarkIndex].tags.push(targetTag)
          }
        }
      }
    }

    updateBookmarkInList(mostVisitedBookmarks.value, bookmark.id)
    updateBookmarkInList(searchResults.value, bookmark.id)

    // 异步更新服务器数据
    const response = await BookmarkAPI.update({
      id: bookmark.id,
      tags: newTagIds.length > 0 ? newTagIds : undefined
    }) as any

    if (!(response?.flag || response?.code === 0)) {
      // 如果服务器更新失败，恢复本地数据
      await fetchMostVisited()
      if (searchQuery.value.trim()) {
        await searchBookmarks(searchQuery.value.trim())
      }
    }
  } catch (error) {
    console.error('Failed to toggle bookmark tag:', error)
    // 出错时重新获取数据以确保同步
    await fetchMostVisited()
    if (searchQuery.value.trim()) {
      await searchBookmarks(searchQuery.value.trim())
    }
  }
}

// 检查重复书签
const checkDuplicateBookmarks = async () => {
  try {
    duplicateLoading.value = true
    const response = await BookmarkAPI.checkDuplicate()
    // 将后端返回的Map转换为前端可用的格式
    if (response.data) {
      duplicateBookmarks.value = new Map(Object.entries(response.data))
      showDuplicateModal.value = true
    }
  } catch (error) {
    console.error('Failed to check duplicate bookmarks:', error)
    alert('检查重复书签失败，请重试')
  } finally {
    duplicateLoading.value = false
  }
}

// 忽略重复书签检查
const ignoreDuplicateBookmark = async (bookmarkId: string) => {
  try {
    await BookmarkAPI.ignoreDuplicateCheck(bookmarkId)
    // 从重复书签列表中移除
    for (const [domain, bookmarks] of duplicateBookmarks.value) {
      const filteredBookmarks = bookmarks.filter(b => b.id !== bookmarkId)
      if (filteredBookmarks.length <= 1) {
        duplicateBookmarks.value.delete(domain)
      } else {
        duplicateBookmarks.value.set(domain, filteredBookmarks)
      }
    }
    duplicateBookmarks.value = new Map(duplicateBookmarks.value)
  } catch (error) {
    console.error('Failed to ignore duplicate bookmark:', error)
    alert('忽略重复检查失败')
  }
}

// 删除重复书签
const deleteDuplicateBookmark = async (bookmarkId: string) => {
  try {
    await BookmarkAPI.delete(bookmarkId)
    // 从重复书签列表中移除
    for (const [domain, bookmarks] of duplicateBookmarks.value) {
      const filteredBookmarks = bookmarks.filter(b => b.id !== bookmarkId)
      if (filteredBookmarks.length <= 1) {
        duplicateBookmarks.value.delete(domain)
      } else {
        duplicateBookmarks.value.set(domain, filteredBookmarks)
      }
    }
    duplicateBookmarks.value = new Map(duplicateBookmarks.value)
  } catch (error) {
    console.error('Failed to delete duplicate bookmark:', error)
    alert('删除书签失败')
  }
}

// 开始编辑书签
const startEditing = (bookmark: any) => {
  editingBookmarks.value[bookmark.id] = {
    name: bookmark.name,
    url: bookmark.url
  }
}

// 保存书签编辑
const saveBookmarkEdit = async (bookmarkId: string) => {
  try {
    const editedBookmark = editingBookmarks.value[bookmarkId]
    if (!editedBookmark || !editedBookmark.name.trim() || !editedBookmark.url.trim()) {
      alert('书签名称和URL不能为空')
      return
    }

    const response = await BookmarkAPI.update({
      id: bookmarkId,
      name: editedBookmark.name,
      url: editedBookmark.url
    }) as any

    if (response?.flag || response?.code === 0) {
      // 更新本地数据
      for (const [domain, bookmarks] of duplicateBookmarks.value) {
        const updatedBookmarks = bookmarks.map(b => {
          if (b.id === bookmarkId) {
            return { ...b, name: editedBookmark.name, url: editedBookmark.url }
          }
          return b
        })
        duplicateBookmarks.value.set(domain, updatedBookmarks)
      }
      // 退出编辑状态
      delete editingBookmarks.value[bookmarkId]
    } else {
      alert('保存失败：' + (response?.message || '未知错误'))
    }
  } catch (error) {
    console.error('Failed to save bookmark edit:', error)
    alert('保存失败，请重试')
  }
}

// 关闭重复书签模态框
const closeDuplicateModal = () => {
  showDuplicateModal.value = false
  duplicateBookmarks.value = new Map()
  editingBookmarks.value = {}
}

// 页面加载时获取数据
onMounted(() => {
  fetchMostVisited()
  fetchTags()
})
</script>