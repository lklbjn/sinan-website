<script setup lang="ts">
import {ref, onMounted} from "vue"
import {useRouter} from "vue-router"
import {Trash2, MoreHorizontal} from "lucide-vue-next"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {ShareAPI} from '@/services/api'
import type {SpaceResp} from '@/types/api'
import Icon from "@/components/Base/Icon.vue"

interface SpaceItem {
  id: string
  title: string
  url: string
  icon?: string
  description?: string
}

const spaces = ref<SpaceItem[]>([])
const loading = ref(true)
const router = useRouter()
const {isMobile} = useSidebar()
const currentPage = ref(1)
const PAGE_SIZE = 10
const totalCount = ref(0)
const hasMore = ref(false)

// 取消订阅相关
const cancelDialogOpen = ref(false)
const cancelingSpace = ref<SpaceItem | null>(null)
const isCanceling = ref(false)

// 获取用户订阅的空间列表
const fetchSpaces = async (loadMore = false) => {
  try {
    if (!loadMore) {
      loading.value = true
      currentPage.value = 1
      spaces.value = []
    }

    const response = await ShareAPI.getUserCollectionSpaces({
      page: currentPage.value,
      size: PAGE_SIZE
    })

    if (response.code === 0 && response.data?.records) {
      const newSpaces = response.data.records
        .map((space: SpaceResp) => ({
          id: space.id,
          title: space.name,
          url: `/space/${space.id}`,
          icon: space.icon,
          description: space.description
        }))

      if (loadMore) {
        spaces.value = [...spaces.value, ...newSpaces]
      } else {
        spaces.value = newSpaces
      }

      totalCount.value = response.data.total || 0
      hasMore.value = spaces.value.length < totalCount.value
    }
  } catch (error) {
    console.error('获取订阅空间列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载更多
const loadMore = async () => {
  currentPage.value++
  await fetchSpaces(true)
}

// 打开取消订阅确认对话框
const confirmCancelCollection = (item: SpaceItem) => {
  cancelingSpace.value = item
  cancelDialogOpen.value = true
}

// 取消订阅空间
const handleCancelCollection = async () => {
  if (!cancelingSpace.value) return

  try {
    isCanceling.value = true
    // 使用当前登录用户的ID，这里可能需要从store或context获取
    const response = await ShareAPI.removeCollectionUser({
      spaceId: cancelingSpace.value.id,
    })
    
    if (response.code === 0 || response.flag) {
      cancelDialogOpen.value = false
      cancelingSpace.value = null
      // 刷新页面
      window.location.reload()
    }
  } catch (error) {
    console.error('取消订阅失败:', error)
  } finally {
    isCanceling.value = false
  }
}

onMounted(() => {
  fetchSpaces()
})
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>订阅的空间</SidebarGroupLabel>
    <SidebarMenu>
      <div v-if="loading" class="px-2 py-1 text-sm text-muted-foreground">
        加载中...
      </div>
      <div v-else-if="spaces.length === 0" class="px-2 py-1 text-sm text-muted-foreground">
        暂无订阅的空间
      </div>

      <SidebarMenuItem v-for="item in spaces" :key="item.id">
        <SidebarMenuButton 
          :tooltip="item.title" 
          @click="() => router.push(item.url)" 
          class="cursor-pointer"
        >
          <Icon :name="item.icon" v-if="item.icon"/>
          <span>{{ item.title }}</span>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <SidebarMenuAction show-on-hover>
              <MoreHorizontal/>
              <span class="sr-only">更多</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            class="w-48 rounded-lg"
            :side="isMobile ? 'bottom' : 'right'"
            :align="isMobile ? 'end' : 'start'"
          >
            <DropdownMenuItem @click="confirmCancelCollection(item)">
              <Trash2 class="text-muted-foreground"/>
              <span>取消订阅</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      
      <SidebarMenuItem v-if="hasMore">
        <SidebarMenuButton 
          class="text-sidebar-foreground/70"
          @click="loadMore"
        >
          <MoreHorizontal class="text-sidebar-foreground/70"/>
          <span>更多</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>

  <!-- 取消订阅确认对话框 -->
  <AlertDialog v-model:open="cancelDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认取消订阅</AlertDialogTitle>
        <AlertDialogDescription>
          您确定要取消订阅空间 "{{ cancelingSpace?.title }}" 吗？取消后您将无法访问该空间的内容。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isCanceling">取消</AlertDialogCancel>
        <AlertDialogAction
          @click="handleCancelCollection"
          :disabled="isCanceling"
          class="bg-red-600 hover:bg-red-700"
        >
          {{ isCanceling ? '取消中...' : '确认取消' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>