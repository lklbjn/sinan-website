<template>
  <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
    <!-- 标签标题和描述 -->
    <div class="mb-4">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <div
                class="h-8 w-8 rounded-full"
                :style="{ backgroundColor: currentTag?.color || '#52525b' }"
            />
            <h1 class="text-3xl font-bold">{{ currentTag?.name || '加载中...' }}</h1>
          </div>
          <p class="text-muted-foreground">{{ currentTag?.description || '暂无描述' }}</p>
        </div>
        <button
          @click="handleRefresh"
          :class="['p-2 rounded-md hover:bg-muted transition-colors', isRefreshing && 'animate-spin']"
          :disabled="isRefreshing"
          title="刷新书签"
        >
          <RefreshCw class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- 搜索和添加按钮 -->
    <div class="flex gap-2 mb-4">
      <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索"
          class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
          @click="showAddBookmarkModal = true"
          class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
      >
        添加书签
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <!-- 书签网格 -->
    <BookmarkGrid
      v-else
      :bookmarks="filteredBookmarks"
      :available-tags="availableTags"
      empty-state-text="暂无书签"
      empty-state-subtext="在此标签下添加一些书签开始使用吧"
      @click-bookmark="(bookmark) => openBookmark(bookmark.url, bookmark.id)"
      @toggle-star="toggleBookmarkStar"
      @edit-bookmark="editBookmark"
      @delete-bookmark="confirmDeleteBookmark"
      @toggle-tag="handleTagToggle"
    >
      <template #empty-state>
        <svg class="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
        </svg>
        <p>暂无书签</p>
        <p class="text-sm">在此标签下添加一些书签开始使用吧</p>
      </template>
    </BookmarkGrid>

    <!-- 添加书签弹窗 -->
    <AddBookmarkModal
        v-model:open="showAddBookmarkModal"
        :default-tag-ids="[tagId]"
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
import {useRoute} from 'vue-router'
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

const route = useRoute()
const tagId = computed(() => route.params.id as string)

// 响应式数据
const bookmarks = ref<BookmarkResp[]>([])
const currentTag = ref<TagResp | null>(null)
const availableTags = ref<TagResp[]>([])
const searchQuery = ref('')
const loading = ref(false)
const isRefreshing = ref(false)
const showAddBookmarkModal = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const deletingBookmarkId = ref<string | null>(null)
const editingBookmark = ref<BookmarkResp | null>(null)


// 过滤后的书签
const filteredBookmarks = computed(() => {
  if (!searchQuery.value) return bookmarks.value

  const query = searchQuery.value.toLowerCase()
  return bookmarks.value.filter(bookmark =>
      bookmark.name?.toLowerCase().includes(query) ||
      bookmark.url?.toLowerCase().includes(query) ||
      bookmark.description?.toLowerCase().includes(query)
  )
})

// 获取标签信息
const fetchTagInfo = async () => {
  try {
    const response = await TagAPI.getById(tagId.value) as any
    if (response?.code === 0 && response?.data) {
      currentTag.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch tag info:', error)
  }
}

// 获取标签下的书签
const fetchBookmarks = async () => {
  try {
    loading.value = true
    const response = await BookmarkAPI.getByTagId(tagId.value) as any
    if (response?.flag && response?.data) {
      bookmarks.value = response.data || []
    }
  } catch (error) {
    console.error('Failed to fetch bookmarks:', error)
  } finally {
    loading.value = false
  }
}

// 打开书签
const openBookmark = async (url: string, bookmarkId?: string) => {
  // 如果提供了bookmarkId，先调用增加使用次数接口
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
      bookmarks.value = bookmarks.value.filter(b => b.id !== deletingBookmarkId.value)
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
      await fetchBookmarks()
    }
  } catch (error) {
    console.error('Failed to toggle bookmark star:', error)
  }
}

// 获取所有标签
const fetchTags = async () => {
  try {
    const response = await TagAPI.getAllList()
    if (response.code === 0 && response.data) {
      availableTags.value = response.data.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0))
    }
  } catch (error) {
    console.error('Failed to fetch tags:', error)
  }
}

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
    
    // 立即更新本地数据
    const bookmarkIndex = bookmarks.value.findIndex(b => b.id === bookmark.id)
    if (bookmarkIndex !== -1) {
      const targetTag = availableTags.value.find(t => t.id === tagId)
      if (targetTag) {
        if (isTagSelected) {
          // 移除标签
          bookmarks.value[bookmarkIndex].tags = bookmarks.value[bookmarkIndex].tags?.filter(t => t.id !== tagId) || []
        } else {
          // 添加标签
          if (!bookmarks.value[bookmarkIndex].tags) {
            bookmarks.value[bookmarkIndex].tags = []
          }
          bookmarks.value[bookmarkIndex].tags.push(targetTag)
        }
      }
    }
    
    // 异步更新服务器数据
    const response = await BookmarkAPI.update({
      id: bookmark.id,
      tags: newTagIds.length > 0 ? newTagIds : undefined
    }) as any
    
    if (!(response?.flag || response?.code === 0)) {
      // 如果服务器更新失败，恢复本地数据
      await fetchBookmarks()
    }
  } catch (error) {
    console.error('Failed to toggle bookmark tag:', error)
    // 出错时重新获取数据以确保同步
    await fetchBookmarks()
  }
}


// 处理书签添加成功
const handleBookmarkAdded = () => {
  fetchBookmarks()
}

// 处理书签更新成功
const handleBookmarkUpdated = () => {
  fetchBookmarks()
  editingBookmark.value = null
}

// 刷新数据
const handleRefresh = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([
      fetchTagInfo(),
      fetchBookmarks()
    ])
  } finally {
    isRefreshing.value = false
  }
}

// 监听路由变化
watch(tagId, () => {
  fetchTagInfo()
  fetchBookmarks()
})

// 页面加载时获取数据
onMounted(() => {
  fetchTagInfo()
  fetchBookmarks()
  fetchTags()
})
</script>