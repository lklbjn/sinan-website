<template>
  <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
    <!-- 空间标题和描述 -->
    <div class="mb-4">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <component
              v-if="currentSpace?.icon && getIconComponent(currentSpace.icon)"
              :is="getIconComponent(currentSpace.icon)"
              class="h-8 w-8"
            />
            <h1 class="text-3xl font-bold">{{ isLoadingSpace ? '加载中...' : (currentSpace?.name || '未知空间') }}</h1>
          </div>
          <p class="text-muted-foreground">{{ currentSpace?.description || '暂无描述' }}</p>
        </div>
        <div class="flex gap-1">
          <button
            @click="handleRefresh"
            :class="['p-2 rounded-md hover:bg-muted transition-colors', isRefreshing && 'animate-spin']"
            :disabled="isRefreshing"
            title="刷新书签"
          >
            <RefreshCw class="h-5 w-5" />
          </button>
          <button
            @click="toggleSort"
            class="p-2 rounded-md hover:bg-muted transition-colors"
            :title="`按${sortBy === 'name' ? '名称' : '点击次数'}${sortOrder === 'asc' ? '升序' : '降序'}排序`"
          >
            <ArrowUp v-if="sortBy === 'name' && sortOrder === 'asc'" class="h-5 w-5" />
            <ArrowDown v-else-if="sortBy === 'name' && sortOrder === 'desc'" class="h-5 w-5" />
            <ArrowUp v-else-if="sortBy === 'usage' && sortOrder === 'asc'" class="h-5 w-5" />
            <ArrowDown v-else class="h-5 w-5" />
          </button>
        </div>
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
      :show-refresh-tags="true"
      empty-state-text="暂无书签"
      empty-state-subtext="在此空间添加一些书签开始使用吧"
      @click-bookmark="(bookmark) => openBookmark(bookmark.url, bookmark.id)"
      @toggle-star="toggleBookmarkStar"
      @edit-bookmark="editBookmark"
      @delete-bookmark="confirmDeleteBookmark"
      @toggle-tag="handleTagToggle"
      @refresh-tags="fetchTags"
    />

    <!-- 添加书签弹窗 -->
    <AddBookmarkModal
      v-model:open="showAddBookmarkModal"
      :default-space-id="spaceId"
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
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as Icons from 'lucide-vue-next'
import { BookmarkAPI, SpaceAPI, TagAPI } from '@/services/api'
import type { BookmarkResp, SpaceResp, TagResp } from '@/types/api'
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
import { RefreshCw, ArrowUp, ArrowDown } from 'lucide-vue-next'

const route = useRoute()
const spaceId = computed(() => route.params.id as string)

// 响应式数据
const bookmarks = ref<BookmarkResp[]>([])
const currentSpace = ref<SpaceResp | null>(null)
const availableTags = ref<TagResp[]>([])
const searchQuery = ref('')
const loading = ref(false)
const isRefreshing = ref(false)
const isLoadingSpace = ref(false)
const showAddBookmarkModal = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const deletingBookmarkId = ref<string | null>(null)
const editingBookmark = ref<BookmarkResp | null>(null)

// 排序相关状态
const sortBy = ref<'name' | 'usage'>('name') // 'name' | 'usage'
const sortOrder = ref<'asc' | 'desc'>('asc') // 'asc' | 'desc'

// 过滤和排序后的书签
const filteredBookmarks = computed(() => {
  let filtered = bookmarks.value

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(bookmark =>
      bookmark.name?.toLowerCase().includes(query) ||
      bookmark.url?.toLowerCase().includes(query) ||
      bookmark.description?.toLowerCase().includes(query)
    )
  }

  // 排序
  return filtered.sort((a: BookmarkResp, b: BookmarkResp) => {
    let aValue: string | number
    let bValue: string | number

    if (sortBy.value === 'name') {
      aValue = a.name || ''
      bValue = b.name || ''
    } else { // usage
      aValue = a.num || 0
      bValue = b.num || 0
    }

    if (sortOrder.value === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })
})


// 获取图标组件
const getIconComponent = (iconName: string) => {
  if (!iconName) return null
  const icon = (Icons as any)[iconName]
  return icon && typeof icon === 'function' ? icon : null
}

// 获取空间信息
const fetchSpaceInfo = async () => {
  if (!spaceId.value) {
    console.warn('No space ID provided')
    return
  }
  
  isLoadingSpace.value = true
  
  try {
    const response = await SpaceAPI.getById(spaceId.value) as any
    console.log('Space API Response:', response) // 调试日志
    
    // API 返回格式是 ApiResponse<SpaceResp>
    // 成功响应检查：code === 0 或 flag === true
    if (response && (response.code === 0 || response.flag === true)) {
      if (response.data) {
        currentSpace.value = response.data
        console.log('Space info loaded:', currentSpace.value) // 调试日志
      }
    } else {
      console.warn('Failed to fetch space info, response:', response)
    }
  } catch (error) {
    console.error('Failed to fetch space info:', error)
    // 设置默认值避免一直显示"加载中..."
    currentSpace.value = {
      id: spaceId.value,
      name: '未知空间',
      description: '无法加载空间信息',
      icon: '',
      sort: 0,
      shared: false,
      key: '',
      createTime: '',
      updateTime: ''
    } as SpaceResp
  } finally {
    isLoadingSpace.value = false
  }
}

// 获取空间下的书签
const fetchBookmarks = async () => {
  try {
    loading.value = true
    const response = await BookmarkAPI.getBySpaceId(spaceId.value) as any
    if (response?.flag && response?.data) {
      bookmarks.value = response.data || []
    }
  } catch (error) {
    console.error('Failed to fetch bookmarks:', error)
  } finally {
    loading.value = false
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

// 切换排序
const toggleSort = () => {
  if (sortBy.value === 'name') {
    sortBy.value = 'usage'
    sortOrder.value = 'desc' // 点击次数默认降序
  } else {
    sortBy.value = 'name'
    sortOrder.value = 'asc' // 名称默认升序
  }
}

// 刷新数据
const handleRefresh = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([
      fetchSpaceInfo(),
      fetchBookmarks(),
      fetchTags()
    ])
  } finally {
    isRefreshing.value = false
  }
}

// 监听路由变化
watch(spaceId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    // 清除旧数据
    currentSpace.value = null
    bookmarks.value = []
    
    // 并行加载新数据
    await Promise.all([
      fetchSpaceInfo(),
      fetchBookmarks()
    ])
  }
}, { immediate: true })

// 页面加载时获取标签数据
onMounted(() => {
  fetchTags()
})
</script>