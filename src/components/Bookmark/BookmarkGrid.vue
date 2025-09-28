<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
    <template v-for="bookmark in bookmarks" :key="bookmark.id">
      <ContextMenu :disabled="bookmark.subscribed">
        <ContextMenuTrigger :disabled="bookmark.subscribed" as-child>
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
                @error="(e) => (e.target as HTMLImageElement).src = '/icon.png'" />
              <!-- 其次使用Google Favicon服务，失败时降级到Sinan API -->
              <img v-else-if="getFaviconUrl(bookmark.url)" :src="getFaviconUrl(bookmark.url)" :alt="bookmark.name"
                class="h-full w-full object-cover select-none" @error="(e) => onFaviconError(e, bookmark.url)" />
              <!-- 默认使用项目Logo -->
              <img v-else src="/icon.png" :alt="bookmark.name" class="h-full w-full object-cover select-none" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate select-none">{{ bookmark.name }}</p>
              <p class="text-xs text-muted-foreground truncate select-none">{{ bookmark.url }}</p>
            </div>
            <!-- 订阅铃铛图标 -->
            <div v-if="bookmark.subscribed" class="flex items-center justify-center flex-shrink-0">
              <svg class="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
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

        <ContextMenuContent class="w-64">
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
          <!-- 标签选择区域 -->
          <div class="px-2 py-2">
            <div class="flex items-center gap-2 mb-2">
              <Tag class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">标签</span>
              <button v-if="showRefreshTags" @click.stop="$emit('refresh-tags')"
                class="p-1 rounded hover:bg-muted transition-colors" title="刷新标签列表">
                <RefreshCw class="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            <div v-if="availableTags.length === 0" class="text-sm text-muted-foreground">
              暂无可用标签
            </div>
            <div v-else class="flex flex-wrap gap-1">
              <button v-for="tag in availableTags" :key="tag.id"
                @pointerdown.stop.prevent="$emit('toggle-tag', bookmark, tag.id, $event)" :class="[
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
                  bookmark.tags?.some(t => t.id === tag.id)
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted hover:bg-muted/80 border border-transparent'
                ]">
                <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: tag.color || '#52525b' }" />
                <span>{{ tag.name }}</span>
                <Check v-if="bookmark.tags?.some(t => t.id === tag.id)" class="h-3 w-3 ml-0.5" />
              </button>
            </div>
          </div>
          <ContextMenuSeparator />
          <ContextMenuItem @click="$emit('delete-bookmark', bookmark.id)" class="flex items-center text-red-600">
            <Trash2 class="mr-2 h-4 w-4" />
            <span>删除书签</span>
          </ContextMenuItem>
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
import type { BookmarkResp, TagResp } from '@/types/api'
import { useFavicon } from '@/composables/useFavicon'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

import { Edit, Trash2, Star, RefreshCw, Tag, Check } from 'lucide-vue-next'

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

withDefaults(defineProps<Props>(), {
  emptyStateText: '',
  emptyStateSubtext: '',
  showRefreshTags: false
})

const emit = defineEmits<Emits>()

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