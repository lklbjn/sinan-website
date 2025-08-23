<script setup lang="ts">
import {ref, onMounted, onUnmounted} from "vue"
import {useRouter} from "vue-router"
import {Plus} from "lucide-vue-next"
import { eventBus, EVENTS } from '@/utils/eventBus'

import {
  SidebarGroup, SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu, SidebarMenuAction,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import IconPicker from '@/components/Base/IconPicker.vue'
import {SpaceAPI} from '@/services/api'
import type {SpaceResp, AddSpaceReq, EditSpaceReq} from '@/types/api'
import Icon from "@/components/Base/Icon.vue";
import {Folder, Forward, MoreHorizontal, Trash2} from "lucide-vue-next";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface SpaceItem {
  id: string
  title: string
  url: string
  icon?: string  // 修改为 string 类型，因为使用的是图标名称字符串
  isActive?: boolean
  description?: string
  sort?: number
  items?: {
    title: string
    url: string
  }[]
}

const spaces = ref<SpaceItem[]>([])
const loading = ref(true)
const router = useRouter()
const { isMobile } = useSidebar()
const currentPage = ref(1)
const PAGE_SIZE = 5
const totalCount = ref(0)
const hasMore = ref(false)

const dialogOpen = ref(false)
const editDialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const newSpace = ref<AddSpaceReq>({
  name: '',
  icon: '',
  description: '',
  sort: 0
})
const editSpace = ref<EditSpaceReq>({
  id: '',
  name: '',
  icon: '',
  description: '',
  sort: 0
})
const deletingSpace = ref<SpaceItem | null>(null)
const isSubmitting = ref(false)
const isDeleting = ref(false)

const handleAddSpace = async () => {
  if (!newSpace.value.name.trim()) {
    return
  }
  
  try {
    isSubmitting.value = true
    const response = await SpaceAPI.create(newSpace.value)
    if (response.code === 0) {
      dialogOpen.value = false
      newSpace.value = { name: '', icon: '', description: '', sort: 0 }
      await fetchSpaces()
    }
  } catch (error) {
    console.error('创建空间失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

const openEditDialog = (item: SpaceItem) => {
  editSpace.value = {
    id: item.id,
    name: item.title,
    icon: item.icon || '',
    description: item.description || '',
    sort: item.sort || 0
  }
  editDialogOpen.value = true
}

const handleEditSpace = async () => {
  if (!editSpace.value.name?.trim()) {
    return
  }
  
  try {
    isSubmitting.value = true
    const response = await SpaceAPI.update(editSpace.value)
    if (response.code === 0) {
      editDialogOpen.value = false
      await fetchSpaces()
    }
  } catch (error) {
    console.error('修改空间失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

const confirmDeleteSpace = (item: SpaceItem) => {
  deletingSpace.value = item
  deleteDialogOpen.value = true
}

const handleDeleteSpace = async () => {
  if (!deletingSpace.value) return
  
  try {
    isDeleting.value = true
    const response = await SpaceAPI.delete(deletingSpace.value.id)
    if (response.code === 0 || response.flag) {
      deleteDialogOpen.value = false
      deletingSpace.value = null
      await fetchSpaces()
    }
  } catch (error) {
    console.error('删除空间失败:', error)
  } finally {
    isDeleting.value = false
  }
}

const fetchSpaces = async (loadMore = false) => {
  try {
    if (!loadMore) {
      loading.value = true
      currentPage.value = 1
      spaces.value = []
    }
    
    const response = await SpaceAPI.getAll({
      page: currentPage.value,
      size: PAGE_SIZE
    })
    
    if (response.code === 0 && response.data.records) {
      const newSpaces = response.data.records
          .sort((a, b) => (a.sort || 0) - (b.sort || 0))
          .map((space: SpaceResp) => ({
            id: space.id,
            title: space.name,
            url: `/space/${space.id}`,
            icon: space.icon,
            description: space.description,
            sort: space.sort,
            isActive: false,
            items: []
          }))
      
      if (loadMore) {
        spaces.value = [...spaces.value, ...newSpaces]
      } else {
        spaces.value = newSpaces
      }
      
      totalCount.value = response.data.total
      hasMore.value = spaces.value.length < totalCount.value
    }
  } catch (error) {
    console.error('获取空间列表失败:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  currentPage.value++
  await fetchSpaces(true)
}


// 监听刷新事件
const handleRefreshSpaces = () => {
  fetchSpaces()
}

onMounted(() => {
  fetchSpaces()
  // 监听空间列表刷新事件
  eventBus.on(EVENTS.REFRESH_SPACES, handleRefreshSpaces)
})

onUnmounted(() => {
  // 清理事件监听器
  eventBus.off(EVENTS.REFRESH_SPACES, handleRefreshSpaces)
})
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>空间</SidebarGroupLabel>
    <AlertDialog v-model:open="dialogOpen">
      <AlertDialogTrigger as-child>
        <SidebarGroupAction title="新增空间">
          <Plus/> 
          <span class="sr-only">新增空间</span>
        </SidebarGroupAction>
      </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
          <AlertDialogTitle>新增空间</AlertDialogTitle>
          <AlertDialogDescription>
            创建一个新的空间来组织您的书签
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label for="space-name">名称</Label>
            <Input 
              id="space-name" 
              v-model="newSpace.name" 
              placeholder="输入空间名称"
              :disabled="isSubmitting"
            />
          </div>
          <div class="space-y-2">
            <Label for="space-icon">图标</Label>
            <IconPicker
              v-model="newSpace.icon"
              placeholder="选择图标"
              :disabled="isSubmitting"
            />
          </div>
          <div class="space-y-2">
            <Label for="space-description">描述</Label>
            <Input 
              id="space-description" 
              v-model="newSpace.description" 
              placeholder="输入空间描述"
              :disabled="isSubmitting"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isSubmitting">取消</AlertDialogCancel>
          <AlertDialogAction 
            @click="handleAddSpace"
            :disabled="isSubmitting || !newSpace.name.trim()"
          >
            {{ isSubmitting ? '创建中...' : '创建' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <SidebarMenu>
      <div v-if="loading" class="px-2 py-1 text-sm text-muted-foreground">
        加载中...
      </div>
      <div v-else-if="spaces.length === 0" class="px-2 py-1 text-sm text-muted-foreground">
        暂无空间
      </div>
      
      <SidebarMenuItem v-for="item in spaces" :key="item.id">
        <SidebarMenuButton :tooltip="item.title" @click="() => router.push(item.url)" class="cursor-pointer">
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
            <DropdownMenuItem @click="openEditDialog(item)">
              <Folder class="text-muted-foreground"/>
              <span>修改空间</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Forward class="text-muted-foreground"/>
              <span>分享空间</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator/>
            <DropdownMenuItem @click="confirmDeleteSpace(item)">
              <Trash2 class="text-muted-foreground"/>
              <span>删除空间</span>
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
  
  <!-- 编辑空间对话框 -->
  <AlertDialog v-model:open="editDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>编辑空间</AlertDialogTitle>
        <AlertDialogDescription>
          修改空间的信息
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="edit-space-name">名称</Label>
          <Input 
            id="edit-space-name" 
            v-model="editSpace.name" 
            placeholder="输入空间名称"
            :disabled="isSubmitting"
          />
        </div>
        <div class="space-y-2">
          <Label for="edit-space-icon">图标</Label>
          <IconPicker
            v-model="editSpace.icon"
            placeholder="选择图标"
            :disabled="isSubmitting"
          />
        </div>
        <div class="space-y-2">
          <Label for="edit-space-description">描述</Label>
          <Input 
            id="edit-space-description" 
            v-model="editSpace.description" 
            placeholder="输入空间描述"
            :disabled="isSubmitting"
          />
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isSubmitting">取消</AlertDialogCancel>
        <AlertDialogAction 
          @click="handleEditSpace"
          :disabled="isSubmitting || !editSpace.name?.trim()"
        >
          {{ isSubmitting ? '保存中...' : '保存' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  
  <!-- 删除确认对话框 -->
  <AlertDialog v-model:open="deleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除</AlertDialogTitle>
        <AlertDialogDescription>
          您确定要删除空间 "{{ deletingSpace?.title }}" 吗？删除后该空间下的所有书签将变为游离状态，此操作不可撤销。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isDeleting">取消</AlertDialogCancel>
        <AlertDialogAction 
          @click="handleDeleteSpace"
          :disabled="isDeleting"
          class="bg-red-600 hover:bg-red-700"
        >
          {{ isDeleting ? '删除中...' : '删除' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
