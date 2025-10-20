<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
    <template v-for="bookmark in bookmarks" :key="bookmark.id">
      <ContextMenu>
        <ContextMenuTrigger as-child>
          <div @click="handleBookmarkClick(bookmark)" :class="[
            'flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground transition-all',
            bookmark.subscribed ? 'cursor-default' : 'cursor-pointer',
            bookmark.star
              ? 'shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] border-amber-200/50'
              : 'shadow-sm hover:shadow-md'
          ]">
            <div class="flex h-8 w-8 items-center justify-center rounded-md bg-muted overflow-hidden">
              <!-- 优先使用存储的图标（HTTP URL 或 base64） -->
              <img v-if="isValidIcon(bookmark.icon)" :src="String(bookmark.icon)" :alt="bookmark.name"
                class="h-full w-full object-cover select-none"
                @error="(e) => (e.target as HTMLImageElement).src = iconPath" />
              <!-- 其次使用Google Favicon服务，失败时降级到Sinan API -->
              <img v-else-if="getFaviconUrl(bookmark.url)" :src="getFaviconUrl(bookmark.url)" :alt="bookmark.name"
                class="h-full w-full object-cover select-none" @error="(e) => onFaviconError(e, bookmark.url)" />
              <!-- 默认使用项目Logo -->
              <img v-else :src="iconPath" :alt="bookmark.name" class="h-full w-full object-cover select-none" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate select-none">{{ bookmark.name }}</p>
              <p class="text-xs text-muted-foreground truncate select-none">{{ bookmark.url }}</p>
            </div>
            <!-- 订阅王冠图标 -->
            <div v-if="bookmark.subscribed" class="flex items-center justify-center flex-shrink-0">
              <svg class="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 2c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z"/>
              </svg>
            </div>
            <!-- 标签颜色指示器 -->
            <div v-else-if="bookmark.tags && bookmark.tags.length > 0" class="flex items-center -space-x-2 flex-shrink-0">
              <div v-for="(tag, index) in bookmark.tags.slice(0, 3)" :key="tag.id"
                class="h-4 w-4 rounded-full border-2 border-white dark:border-gray-800"
                :style="{ backgroundColor: tag.color || '#52525b', zIndex: bookmark.tags.length - index }"
                :title="tag.name" />
              <div v-if="bookmark.tags.length > 3"
                class="h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 bg-gray-400 flex items-center justify-center"
                :title="`还有 ${bookmark.tags.length - 3} 个标签`">
                <span class="text-[8px] text-white font-semibold">+{{ bookmark.tags.length - 3 }}</span>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent class="w-64 min-w-56 max-w-96 resize overflow-hidden relative flex flex-col" v-if="!bookmark.subscribed">
          <!-- 固定的顶部菜单项 -->
          <div class="flex-shrink-0">
            <ContextMenuItem @click="$emit('toggle-star', bookmark)" class="flex items-center">
              <Star
                :class="['mr-2 h-4 w-4', bookmark.star ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground']" />
              <span>{{ bookmark.star ? '取消星标' : '添加星标' }}</span>
            </ContextMenuItem>
            <ContextMenuItem @click="$emit('edit-bookmark', bookmark)" class="flex items-center">
              <Edit class="mr-2 h-4 w-4 text-muted-foreground" />
              <span>编辑书签</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
          </div>
        <!-- 可滚动的标签区域 -->
          <div class="flex-1 overflow-hidden">
            <!-- 标签选择区域 -->
            <div class="px-2 py-2 h-full flex flex-col">
              <div class="flex items-center gap-2 mb-2 flex-shrink-0">
                <Tag class="h-4 w-4 text-muted-foreground" />
                <span class="text-sm font-medium">标签</span>
                <button v-if="showRefreshTags" @click.stop="$emit('refresh-tags')"
                  class="p-1 rounded hover:bg-muted transition-colors" title="刷新标签列表">
                  <RefreshCw class="h-3 w-3 text-muted-foreground" />
                </button>
              </div>

              <!-- 标签搜索框 -->
              <div class="relative mb-2 flex-shrink-0">
              <input
                v-model="tagSearchQuery"
                @click.stop
                placeholder="搜索标签..."
                class="w-full px-2 py-1 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Search v-if="!tagSearchQuery" class="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            </div>

            <div v-if="filteredTags.length === 0" class="text-sm text-muted-foreground">
              {{ tagSearchQuery ? '未找到匹配的标签' : '暂无可用标签' }}
            </div>
            <div v-else class="flex-1 overflow-y-auto min-h-0">
                <div class="flex flex-wrap gap-1">
                <button v-for="tag in getDisplayTags(bookmark)" :key="tag.id"
                  @pointerdown.stop.prevent="$emit('toggle-tag', bookmark, tag.id, $event)" :class="[
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
                    bookmark.tags?.some((t: TagResp) => t.id === tag.id)
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-muted hover:bg-muted/80 border border-transparent'
                  ]">
                  <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: tag.color || '#52525b' }" />
                  <span>{{ tag.name }}</span>
                  <Check v-if="bookmark.tags?.some((t: TagResp) => t.id === tag.id)" class="h-3 w-3 ml-0.5" />
                </button>
              </div>
              <div v-if="filteredTags.length > defaultDisplayCount && !tagSearchQuery" class="mt-1 text-xs text-muted-foreground">
                <div class="flex items-center justify-between gap-2">
                  <span>显示 {{ getDisplayTags(bookmark).length }}/{{ filteredTags.length }} 个标签</span>
                  <button
                    v-if="shouldShowViewAllButton(bookmark)"
                    @click.stop="toggleShowAllTags(bookmark.id)"
                    class="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    {{ showAllTags.has(bookmark.id) ? '收起' : '查看全部' }}
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
          <!-- 固定的底部删除按钮 -->
          <div class="flex-shrink-0">
            <ContextMenuSeparator />
            <ContextMenuItem @click="$emit('delete-bookmark', bookmark.id)" class="flex items-center text-red-600">
              <Trash2 class="mr-2 h-4 w-4" />
              <span>删除书签</span>
            </ContextMenuItem>
          </div>
        </ContextMenuContent>
      </ContextMenu>
    </template>

    <!-- Empty State -->
    <div v-if="bookmarks.length === 0"
      class="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
      <slot name="empty-state">
        <svg class="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <p>{{ emptyStateText || '暂无书签' }}</p>
        <p class="text-sm">{{ emptyStateSubtext || '添加一些书签开始使用吧' }}</p>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { BookmarkResp, TagResp } from '@/types/api'
import { useFavicon } from '@/composables/useFavicon'
import { useDynamicIcon } from '@/composables/useDynamicIcon'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

import { Edit, Trash2, Star, RefreshCw, Tag, Check, Search } from 'lucide-vue-next'

interface Props {
  bookmarks: BookmarkResp[]
  availableTags: TagResp[]
  emptyStateText?: string
  emptyStateSubtext?: string
  showRefreshTags?: boolean
}

interface Emits {
  (e: 'click-bookmark', bookmark: BookmarkResp): void
  (e: 'toggle-star', bookmark: BookmarkResp): void
  (e: 'edit-bookmark', bookmark: BookmarkResp): void
  (e: 'delete-bookmark', bookmarkId: string): void
  (e: 'toggle-tag', bookmark: BookmarkResp, tagId: string, event: Event): void
  (e: 'refresh-tags'): void
}

const props = withDefaults(defineProps<Props>(), {
  emptyStateText: '',
  emptyStateSubtext: '',
  showRefreshTags: false
})

const emit = defineEmits<Emits>()

// 使用favicon组合式函数
const { getFaviconUrl } = useFavicon()
const { iconPath } = useDynamicIcon()

// 标签搜索和显示逻辑
const tagSearchQuery = ref('')
const defaultDisplayCount = 10
const showAllTags = ref(new Set<string>()) // 记录哪些书签显示全部标签

// 过滤标签（基于搜索词）
const filteredTags = computed(() => {
  if (!tagSearchQuery.value) {
    return props.availableTags
  }

  const query = tagSearchQuery.value.toLowerCase()
  return props.availableTags.filter((tag: TagResp) =>
    tag.name.toLowerCase().includes(query)
  )
})

// 获取显示的标签（对于特定书签）
const getDisplayTags = (bookmark: BookmarkResp) => {
  const sorted = [...filteredTags.value].sort((a: TagResp, b: TagResp) => {
    const aSelected = bookmark.tags?.some((t: TagResp) => t.id === a.id)
    const bSelected = bookmark.tags?.some((t: TagResp) => t.id === b.id)

    // 已选中的标签置顶
    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1

    // 同类型按名称排序（支持中文排序）
    return a.name.localeCompare(b.name, 'zh-CN')
  })

  // 如果有搜索词，显示所有匹配结果
  if (tagSearchQuery.value) {
    return sorted
  }

  // 如果选择了显示全部标签，显示所有标签
  if (showAllTags.value.has(bookmark.id)) {
    return sorted
  }

  // 分离已选择和未选择的标签
  const selected = sorted.filter(tag => bookmark.tags?.some((t: TagResp) => t.id === tag.id))
  const unselected = sorted.filter(tag => !bookmark.tags?.some((t: TagResp) => t.id === tag.id))

  // 返回所有已选择的标签 + 最多10个未选择的标签
  return [...selected, ...unselected.slice(0, defaultDisplayCount)]
}

// 切换显示全部标签
const toggleShowAllTags = (bookmarkId: string) => {
  if (showAllTags.value.has(bookmarkId)) {
    showAllTags.value.delete(bookmarkId)
  } else {
    showAllTags.value.add(bookmarkId)
  }
}

// 判断是否显示查看全部按钮
const shouldShowViewAllButton = (bookmark: BookmarkResp) => {
  if (tagSearchQuery.value) return false // 搜索时不显示
  if (showAllTags.value.has(bookmark.id)) return false // 已显示全部时隐藏

  const displayTags = getDisplayTags(bookmark)
  return displayTags.length < filteredTags.value.length
}

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
    img.src = iconPath.value
  }
}

// 判断是否为有效的图标（HTTP URL 或 base64）
const isValidIcon = (icon: number | string): boolean => {
  if (typeof icon !== 'string') return false
  // 检查是否为 HTTP/HTTPS URL
  if (icon.startsWith('http://') || icon.startsWith('https://')) return true
  // 检查是否为 base64 图片
  if (icon.startsWith('data:image/')) return true
  return false
}

// 处理书签点击
const handleBookmarkClick = (bookmark: BookmarkResp) => {
  emit('click-bookmark', bookmark)
}

</script>