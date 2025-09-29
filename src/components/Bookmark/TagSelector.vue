<template>
  <div ref="containerRef" class="w-full space-y-2">
    <!-- 已选标签显示 -->
    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-2">
      <div
        v-for="tagId in modelValue"
        :key="tagId"
        class="inline-flex items-center gap-2 px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
      >
        <div
          class="w-2 h-2 rounded-full"
          :style="{ backgroundColor: getTagColor(tagId) }"
        ></div>
        <span>{{ getTagName(tagId) }}</span>
        <button
          @click="removeTag(tagId)"
          class="hover:bg-secondary-foreground/20 rounded-full p-0.5"
          type="button"
        >
          <X class="h-3 w-3" />
        </button>
      </div>
    </div>

    <!-- 标签选择器 -->
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          class="w-full justify-between"
        >
          <span class="text-muted-foreground">选择或搜索标签...</span>
          <ChevronsUpDown class="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        class="p-0"
        align="start"
        side="bottom"
        :style="{ width: contentWidth }"
      >
        <div class="flex flex-col max-h-[300px]">
          <!-- 搜索框 -->
          <div class="flex items-center border-b px-3 pb-2 pt-3">
            <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              v-model="searchQuery"
              placeholder="搜索标签..."
              class="h-8 w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 px-2"
              @input="handleSearch"
            />
          </div>

          <!-- 标签列表 -->
          <div class="overflow-y-auto flex-1 p-1">
            <div v-if="loading" class="py-6 text-center text-sm text-muted-foreground">
              加载中...
            </div>
            <div v-else-if="availableTags.length === 0" class="py-6 text-center text-sm text-muted-foreground">
              {{ searchQuery ? '没有找到匹配的标签' : '暂无标签' }}
            </div>
            <button
              v-for="tag in availableTags"
              :key="tag.id"
              @click="selectTag(tag)"
              class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <div
                class="w-2 h-2 rounded-full mr-2"
                :style="{ backgroundColor: tag.color || '#6b7280' }"
              ></div>
              <span>{{ tag.name }}</span>
            </button>

            <!-- 加载更多按钮 -->
            <button
              v-if="hasMore"
              @click="loadMore"
              class="relative flex w-full cursor-pointer select-none items-center justify-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            >
              <MoreHorizontal class="mr-2 h-4 w-4" />
              <span>加载更多</span>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ChevronsUpDown, Search, MoreHorizontal, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TagAPI } from '@/services/api'
import type { TagResp } from '@/types/api'
import { debounce } from 'lodash-es'
import { eventBus, EVENTS } from '@/utils/eventBus'

interface Props {
  modelValue: string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const containerRef = ref<HTMLElement>()
const contentWidth = ref('100%')
const open = ref(false)
const tags = ref<TagResp[]>([])
const allTags = ref<TagResp[]>([]) // 存储所有标签，用于显示已选择标签的名称和颜色
const loading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const PAGE_SIZE = 10
const totalCount = ref(0)
const hasMore = ref(false)

// 可选择的标签（排除已选择的）
const availableTags = computed(() => {
  return tags.value.filter(tag => !props.modelValue.includes(tag.id))
})

// 获取标签名称
const getTagName = (tagId: string) => {
  const tag = allTags.value.find(t => t.id === tagId)
  return tag ? tag.name : tagId
}

// 获取标签颜色
const getTagColor = (tagId: string) => {
  const tag = allTags.value.find(t => t.id === tagId)
  return tag?.color || '#6b7280'
}

// 获取所有标签（用于显示已选择标签的名称和颜色）
const fetchAllTags = async () => {
  try {
    const response = await TagAPI.getAllList()
    if (response.code === 0 && response.data) {
      allTags.value = response.data || []
    }
  } catch (error) {
    console.error('获取全部标签失败:', error)
  }
}

const fetchTags = async (reset = false) => {
  try {
    if (reset) {
      currentPage.value = 1
      tags.value = []
    }

    loading.value = true
    const response = await TagAPI.getAll({
      page: currentPage.value,
      size: PAGE_SIZE,
      search: searchQuery.value || undefined
    })

    if (response.code === 0 && response.data) {
      const newTags = response.data.records || []

      if (reset) {
        tags.value = newTags
      } else {
        tags.value = [...tags.value, ...newTags]
      }

      totalCount.value = response.data.total || 0
      hasMore.value = tags.value.length < totalCount.value
    }
  } catch (error) {
    console.error('获取标签列表失败:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  currentPage.value++
  await fetchTags(false)
}

const handleSearch = debounce(() => {
  fetchTags(true)
}, 300)

const selectTag = (tag: TagResp) => {
  if (!props.modelValue.includes(tag.id)) {
    emit('update:modelValue', [...props.modelValue, tag.id])
  }
  open.value = false
}

const removeTag = (tagId: string) => {
  const newValue = props.modelValue.filter(id => id !== tagId)
  emit('update:modelValue', newValue)
}

// 监听打开状态，首次打开时加载数据并更新宽度
watch(open, async (newValue) => {
  if (newValue) {
    // 更新宽度
    await nextTick()
    if (containerRef.value) {
      contentWidth.value = `${containerRef.value.offsetWidth}px`
    }
    // 加载数据
    if (tags.value.length === 0) {
      fetchTags(true)
    }
  }
})

// 监听搜索词变化
watch(searchQuery, () => {
  currentPage.value = 1
})

// 监听标签刷新事件
const handleRefreshTags = () => {
  fetchAllTags()
  fetchTags(true)
}

onMounted(() => {
  // 监听标签列表刷新事件
  eventBus.on(EVENTS.REFRESH_TAGS, handleRefreshTags)
  // 预加载所有标签数据（用于显示已选择标签的名称和颜色）
  fetchAllTags()
  // 预加载标签数据
  fetchTags(true)
})

// 清理事件监听器
const cleanup = () => {
  eventBus.off(EVENTS.REFRESH_TAGS, handleRefreshTags)
}

// 组件卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanup)
}
</script>