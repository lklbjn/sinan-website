<script setup lang="ts">
import {ref, onMounted, onUnmounted} from "vue"
import {useRouter} from "vue-router"
import {Plus, Users, Link2, X, Eye, EyeOff} from "lucide-vue-next"
import {eventBus, EVENTS} from '@/utils/eventBus'

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
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Button} from '@/components/ui/button'
import {ScrollArea} from '@/components/ui/scroll-area'
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar'
import IconPicker from '@/components/Base/IconPicker.vue'
import {SpaceAPI, ShareAPI} from '@/services/api'
import type {SpaceResp, AddSpaceReq, EditSpaceReq, UpdateShareBookmarkReq} from '@/types/api'
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

interface CollectionUser {
  userId: string
  avatar: string
  name: string
  collectedAt: string
}

const spaces = ref<SpaceItem[]>([])
const loading = ref(true)
const router = useRouter()
const {isMobile} = useSidebar()
const currentPage = ref(1)
const PAGE_SIZE = 5
const totalCount = ref(0)
const hasMore = ref(false)

const dialogOpen = ref(false)
const editDialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const shareDialogOpen = ref(false)
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

// 分享相关状态
const sharingSpace = ref<SpaceItem | null>(null)
const shareSettings = ref<UpdateShareBookmarkReq>({
  spaceId: '',
  enable: false,
  key: ''
})
const shareUrl = ref('')
const collectionUsers = ref<CollectionUser[]>([])
const loadingShare = ref(false)
const loadingUsers = ref(false)
const removingUserId = ref<string | null>(null)
const copySuccessDialogOpen = ref(false)

// 订阅用户分页相关
const usersCurrentPage = ref(1)
const usersPageSize = 10
const usersTotalCount = ref(0)
const usersTotalPages = ref(0)

const handleAddSpace = async () => {
  if (!newSpace.value.name.trim()) {
    return
  }

  try {
    isSubmitting.value = true
    const response = await SpaceAPI.create(newSpace.value)
    if (response.code === 0) {
      dialogOpen.value = false
      newSpace.value = {name: '', icon: '', description: '', sort: 0}
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

// 打开分享对话框
const openShareDialog = async (item: SpaceItem) => {
  sharingSpace.value = item
  shareSettings.value.spaceId = item.id
  shareUrl.value = '' // 重置分享链接
  usersCurrentPage.value = 1 // 重置页码
  shareDialogOpen.value = true

  // 获取分享设置状态
  await fetchShareInfo()

  // 如果空间已分享，自动获取分享链接
  if (shareSettings.value.enable) {
    await fetchShareUrl()
  }

  // 获取订阅用户列表第一页
  await fetchCollectionUsers(1)
}

// 获取分享信息（仅获取状态，不获取链接）
const fetchShareInfo = async () => {
  if (!sharingSpace.value) return

  try {
    loadingShare.value = true
    // 获取空间的详细信息，包含分享状态
    const response = await SpaceAPI.getById(sharingSpace.value.id)
    if (response.code === 0 && response.data) {
      shareSettings.value.enable = response.data.shared || false
      shareSettings.value.key = response.data.key || ''
    }
  } catch (error) {
    console.error('获取分享信息失败:', error)
    // 如果获取失败，设置默认值
    shareSettings.value.enable = false
    shareSettings.value.key = ''
  } finally {
    loadingShare.value = false
  }
}

// 获取分享链接
const fetchShareUrl = async () => {
  if (!sharingSpace.value) return

  try {
    loadingShare.value = true
    const response = await ShareAPI.getShareUrl({spaceId: sharingSpace.value.id})
    if (response.code === 0 && response.data) {
      // response.data 是字符串类型，直接赋值
      shareUrl.value = String(response.data) || ''
      console.log('获取到的分享链接:', shareUrl.value)
    }
  } catch (error) {
    console.error('获取分享链接失败:', error)
    shareUrl.value = ''
  } finally {
    loadingShare.value = false
  }
}

// 获取订阅用户列表
const fetchCollectionUsers = async (page: number = 1) => {
  if (!sharingSpace.value) return

  try {
    loadingUsers.value = true
    usersCurrentPage.value = page

    const response = await ShareAPI.getCollectionsUsers({
      spaceId: sharingSpace.value.id,
      page: usersCurrentPage.value,
      size: usersPageSize
    })
    if (response.code === 0 && response.data) {
      collectionUsers.value = response.data.records || []
      usersTotalCount.value = response.data.total || 0
      usersTotalPages.value = response.data.pages || Math.ceil(usersTotalCount.value / usersPageSize)
    }
  } catch (error) {
    console.error('获取订阅用户失败:', error)
  } finally {
    loadingUsers.value = false
  }
}

// 切换页码
const changeUsersPage = (page: number) => {
  if (page < 1 || page > usersTotalPages.value) return
  fetchCollectionUsers(page)
}

// 更新分享设置
const updateShareSettings = async (autoGeneratePassword = false, refreshUrl = false) => {
  try {
    loadingShare.value = true

    // 如果是开启分享且需要自动生成密码（没有现有密码）
    if (autoGeneratePassword && shareSettings.value.enable && !shareSettings.value.key) {
      generatePassword()
    }

    const response = await ShareAPI.updateShare(shareSettings.value)
    if (response.code === 0) {
      // 如果需要刷新分享链接（比如修改密码后）
      if (refreshUrl && shareSettings.value.enable) {
        await fetchShareUrl()
      } else if (shareSettings.value.enable && !shareUrl.value) {
        // 如果启用了分享但还没有链接，获取链接
        await fetchShareUrl()
      }
    }
  } catch (error) {
    console.error('更新分享设置失败:', error)
  } finally {
    loadingShare.value = false
  }
}

// 移除订阅用户
const removeCollectionUser = async (userId: string) => {
  if (!sharingSpace.value) return

  try {
    removingUserId.value = userId
    const response = await ShareAPI.cancelCollectionUser({
      spaceId: sharingSpace.value.id,
      userId: userId
    })
    if (response.code === 0 || response.flag) {
      // 重新获取当前页数据
      await fetchCollectionUsers(usersCurrentPage.value)
    }
  } catch (error) {
    console.error('取消订阅失败:', error)
  } finally {
    removingUserId.value = null
  }
}

// 复制分享链接
const copyShareUrl = async () => {
  if (shareUrl.value) {
    try {
      await navigator.clipboard.writeText(shareUrl.value)
      // 显示复制成功提示
      copySuccessDialogOpen.value = true
      // 2秒后自动关闭
      setTimeout(() => {
        copySuccessDialogOpen.value = false
      }, 1000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }
}

// 生成随机密码并保存
const generatePassword = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  shareSettings.value.key = password

  // 自动保存新密码并刷新分享链接
  await updateShareSettings(false, true)
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
            <DropdownMenuItem @click="openShareDialog(item)">
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

  <!-- 分享空间对话框 -->
  <AlertDialog v-model:open="shareDialogOpen">
    <AlertDialogContent class="max-w-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle>分享空间 - {{ sharingSpace?.title }}</AlertDialogTitle>
        <AlertDialogDescription>
          管理空间的分享设置和订阅用户
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div class="space-y-6 py-4">
        <!-- 发布状态 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <Label>发布状态</Label>
            <Button
                @click="shareSettings.enable = !shareSettings.enable; updateShareSettings(true)"
                :variant="shareSettings.enable ? 'default' : 'outline'"
                size="sm"
                :disabled="loadingShare"
            >
              <Eye v-if="shareSettings.enable" class="w-4 h-4 mr-2"/>
              <EyeOff v-else class="w-4 h-4 mr-2"/>
              {{ shareSettings.enable ? '已发布' : '未发布' }}
            </Button>
          </div>

          <!-- 访问密码 -->
          <div v-if="shareSettings.enable" class="space-y-2">
            <Label>访问密码</Label>
            <div class="flex gap-2 items-center">
              <Input
                  :model-value="shareSettings.key"
                  type="text"
                  placeholder="留空则无需密码"
                  class="flex-1 h-10"
                  :readonly="true"
                  :disabled="true"
              />
              <Button
                  @click="generatePassword"
                  variant="outline"
                  :disabled="loadingShare"
                  class="h-10"
              >
                {{ loadingShare ? '生成中...' : '生成密码' }}
              </Button>
            </div>
          </div>

          <!-- 分享链接 -->
          <div v-if="shareSettings.enable" class="space-y-2">
            <Label>分享链接</Label>
            <div v-if="!shareUrl" class="space-y-2">
              <Button
                  @click="fetchShareUrl"
                  variant="outline"
                  :disabled="loadingShare"
                  class="w-full h-10"
              >
                <Link2 class="w-4 h-4 mr-2"/>
                {{ loadingShare ? '获取中...' : '获取分享地址' }}
              </Button>
            </div>
            <div v-else class="space-y-2">
              <Input
                  :model-value="shareUrl"
                  :readonly="true"
                  :disabled="true"
                  class="w-full h-10"
              />
              <Button
                  @click="copyShareUrl"
                  variant="outline"
                  class="w-full h-10"
              >
                <Link2 class="w-4 h-4 mr-2"/>
                复制链接
              </Button>
            </div>
          </div>
        </div>

        <!-- 订阅用户列表 -->
        <div v-if="shareSettings.enable" class="space-y-3">
          <div class="flex items-center justify-between">
            <Label>订阅用户 ({{ usersTotalCount }})</Label>
            <Button
                @click="fetchCollectionUsers(usersCurrentPage)"
                size="sm"
                variant="ghost"
                :disabled="loadingUsers"
            >
              <Users class="w-4 h-4 mr-2"/>
              刷新
            </Button>
          </div>

          <ScrollArea class="h-48 w-full rounded-md border p-2">
            <div v-if="loadingUsers" class="flex items-center justify-center h-32">
              <span class="text-sm text-muted-foreground">加载中...</span>
            </div>
            <div v-else-if="collectionUsers.length === 0" class="flex items-center justify-center h-32">
              <span class="text-sm text-muted-foreground">暂无订阅用户</span>
            </div>
            <div v-else class="space-y-2">
              <div
                  v-for="(user, index) in collectionUsers"
                  :key="index"
                  class="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
              >
                <div class="flex items-center gap-3">
                  <Avatar class="w-8 h-8">
                    <AvatarImage v-if="user.avatar" :src="user.avatar"/>
                    <AvatarFallback>{{ user.name?.[0]?.toUpperCase() || '?' }}</AvatarFallback>
                  </Avatar>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium">{{ user.name }}</span>
                    <span class="text-xs text-muted-foreground">{{ user.collectedAt }}</span>
                  </div>
                </div>
                <Button
                    @click="removeCollectionUser(user.userId)"
                    size="sm"
                    variant="ghost"
                    :disabled="removingUserId === user.userId"
                >
                  <X class="w-4 h-4"/>
                </Button>
              </div>
            </div>
          </ScrollArea>

          <!-- 分页控件 -->
          <div v-if="usersTotalPages > 1" class="flex items-center justify-between mt-2">
            <div class="text-sm text-muted-foreground">
              第 {{ usersCurrentPage }} / {{ usersTotalPages }} 页
            </div>
            <div class="flex gap-1">
              <Button
                  @click="changeUsersPage(usersCurrentPage - 1)"
                  size="sm"
                  variant="outline"
                  :disabled="usersCurrentPage <= 1 || loadingUsers"
              >
                上一页
              </Button>
              <Button
                  @click="changeUsersPage(usersCurrentPage + 1)"
                  size="sm"
                  variant="outline"
                  :disabled="usersCurrentPage >= usersTotalPages || loadingUsers"
              >
                下一页
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel>关闭</AlertDialogCancel>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- 复制成功提示 -->
  <AlertDialog v-model:open="copySuccessDialogOpen">
    <AlertDialogContent class="max-w-sm">
      <AlertDialogHeader>
        <AlertDialogTitle class="text-center">复制成功</AlertDialogTitle>
        <AlertDialogDescription class="text-center">
          分享链接已复制到剪贴板
        </AlertDialogDescription>
      </AlertDialogHeader>
    </AlertDialogContent>
  </AlertDialog>
</template>
