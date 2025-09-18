<template>
  <div class="flex flex-1 flex-col gap-6 p-4 pt-0">
    <!-- Welcome Section -->
    <div class="rounded-lg border p-6 relative">
      <div class="flex items-start justify-between mb-2">
        <h1 class="text-3xl font-bold">Welcome back!</h1>
        <button
            @click="handleRefresh"
            :class="['p-2 rounded-md hover:bg-muted transition-colors', isRefreshing && 'animate-spin']"
            :disabled="isRefreshing"
            title="刷新书签"
        >
          <RefreshCw class="h-5 w-5"/>
        </button>
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
      <BookmarkGrid
        v-else
        :bookmarks="filteredBookmarks"
        :available-tags="availableTags"
        :empty-state-text="searchQuery ? '没有找到匹配的书签' : '暂无常用书签'"
        :empty-state-subtext="searchQuery ? '请尝试其他搜索词' : '添加一些书签开始使用吧'"
        :tooltip-delay="500"
        @click-bookmark="(bookmark) => openBookmark(bookmark.url, bookmark.id)"
        @toggle-star="toggleBookmarkStar"
        @edit-bookmark="editBookmark"
        @delete-bookmark="confirmDeleteBookmark"
        @toggle-tag="handleTagToggle"
      />
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
</template>

<script setup lang="ts">
import {ref, onMounted, computed, watch} from 'vue'
import {BookmarkAPI, TagAPI} from '@/services/api'
import type {BookmarkResp, TagResp} from '@/types/api'
import AddBookmarkModal from '@/components/Bookmark/AddBookmarkModal.vue'
import EditBookmarkDialog from '@/components/Bookmark/EditBookmarkDialog.vue'
import BookmarkGrid from '@/components/Bookmark/BookmarkGrid.vue'
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
import {RefreshCw} from 'lucide-vue-next'

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
const handleBookmarkUpdated = () => {
  // 重新获取最常访问的书签以显示更新后的书签
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
    // 直接使用传入的书签数据，避免额外的 API 调用
    if (bookmark && bookmark.id) {
      editingBookmark.value = bookmark
      showEditDialog.value = true
    } else {
      console.error('Invalid bookmark data:', bookmark)
    }
  } catch (error) {
    console.error('Failed to open edit dialog:', error)
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
      // 从列表中移除已删除的书签
      mostVisitedBookmarks.value = mostVisitedBookmarks.value.filter(b => b.id !== deletingBookmarkId.value)
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


// 页面加载时获取数据
onMounted(() => {
  fetchMostVisited()
  fetchTags()
})
</script>