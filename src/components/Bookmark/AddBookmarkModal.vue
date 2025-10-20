<template>
  <AlertDialog v-model:open="isOpen">
    <AlertDialogContent class="sm:max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle>添加书签</AlertDialogTitle>
        <AlertDialogDescription>
          填写以下信息来添加新书签
        </AlertDialogDescription>
      </AlertDialogHeader>

      <form @submit.prevent="handleSubmit" class="grid gap-4 p-4">
        <!-- URL -->
        <div class="grid gap-2">
          <Label for="url">网址 *</Label>
          <div class="flex gap-2">
            <Input id="url" v-model="form.url" type="url" placeholder="https://example.com" required
              @blur="fetchUrlMetadata" class="flex-1" />
            <Button type="button" variant="outline" size="icon" @click="handleAIAnalysis"
              :disabled="isAnalyzing || !form.url.trim()" title="AI 智能分析">
              <svg v-if="!isAnalyzing" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path
                  d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
                <path d="M20 2v4" />
                <path d="M22 4h-4" />
                <circle cx="4" cy="20" r="2" />
              </svg>
              <span v-else class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
            </Button>
          </div>
          <!-- 分析状态显示 -->
          <div v-if="analysisStatus" class="text-sm text-muted-foreground animate-pulse">
            {{ analysisStatus }}
          </div>
        </div>

        <!-- 名称 -->
        <div class="grid gap-2">
          <Label for="name">名称 *</Label>
          <Input id="name" v-model="form.name" placeholder="请输入书签名称" required />
        </div>

        <div class="grid gap-2">
          <Label for="space">空间 *</Label>
          <SpaceSelector v-model="form.namespaceId" />
        </div>

        <!-- 标签选择 -->
        <div class="grid gap-2">
          <Label>标签</Label>
          <TagSelector v-model="selectedTags" />
        </div>

                <!-- 描述 -->
        <div class="grid gap-2">
          <Label for="description">描述</Label>
          <Textarea id="description" v-model="form.description" placeholder="请输入书签描述（可选）" class="max-h-20 resize-none"
            rows="3" />
        </div>
      </form>

      <AlertDialogFooter class="flex gap-2">
        <AlertDialogCancel @click="handleCancel">
          取消
        </AlertDialogCancel>
        <AlertDialogAction @click="handleSubmit" :disabled="isSubmitting || !form.name.trim() || !form.url.trim()">
          <span v-if="isSubmitting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
          {{ isSubmitting ? '添加中...' : '确认添加' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  </template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import SpaceSelector from './SpaceSelector.vue'
import TagSelector from './TagSelector.vue'
import { BookmarkAPI, WebsiteAnalysisAPI, SpaceAPI, TagAPI } from '@/services/api'
import type {
    AddBookmarkReq,
    SpaceResp,
    TagResp,
    NewWebsiteAnalysisResponse
} from '@/types/api'

// Props
interface Props {
  open: boolean
  defaultSpaceId?: string
  defaultTagIds?: string[]
}

// Emits
interface Emits {
  (e: 'update:open', value: boolean): void

  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const isOpen = ref(props.open)
const isSubmitting = ref(false)
const isFetchingMetadata = ref(false)
const isAnalyzing = ref(false)
const selectedTags = ref<string[]>([])

// 流式分析相关状态
const analysisStatus = ref('')
const isAnalysisAborted = ref(false)

// 表单数据
const form = ref<AddBookmarkReq>({
  name: '',
  url: '',
  description: '',
  namespaceId: '',
  tagsIds: []
})

// 监听 open 属性变化
watch(() => props.open, (newValue) => {
  isOpen.value = newValue
  if (newValue) {
    // 自动获取剪切板内容
    autoFillFromClipboard()
    // 如果有默认空间ID，设置它
    if (props.defaultSpaceId) {
      form.value.namespaceId = props.defaultSpaceId
    }
    // 如果有默认标签IDs，设置它们
    if (props.defaultTagIds && props.defaultTagIds.length > 0) {
      selectedTags.value = [...props.defaultTagIds]
    }
  }
})

// 监听内部 open 状态变化
watch(isOpen, (newValue) => {
  emit('update:open', newValue)
  if (!newValue) {
    resetForm()
  }
})

// 重置表单
const resetForm = () => {
  form.value = {
    name: '',
    url: '',
    description: '',
    namespaceId: '',
    tagsIds: []
  }
  selectedTags.value = []

  // 重置分析状态
  analysisStatus.value = ''
  isAnalysisAborted.value = false
  aiAnalysisSpaces.value = ''
  aiAnalysisTags.value = []
}


// 处理表单提交
const handleSubmit = async () => {
  if (!form.value.name.trim() || !form.value.url.trim()) {
    return
  }

  try {
    isSubmitting.value = true

    // 提取新项目用于提交
    const { newSpace, newTags } = extractNewItemsForSubmission()

    // 准备提交数据，过滤空值
    const submitData: AddBookmarkReq = {
      name: form.value.name.trim(),
      url: form.value.url.trim(),
      ...(form.value.description?.trim() && { description: form.value.description.trim() }),

      // 处理空间：如果不是new标记的ID，则使用正常ID；否则使用newSpace
      ...(form.value.namespaceId && !isNewMarkerId(form.value.namespaceId) && { namespaceId: form.value.namespaceId }),

      // 处理标签：过滤掉new标记的ID，正常ID使用tagsIds
      ...(selectedTags.value.filter(id => !isNewMarkerId(id)).length > 0 && {
        tagsIds: selectedTags.value.filter(id => !isNewMarkerId(id))
      }),

      // 新空间和新标签
      ...(newSpace && { newSpace }),
      ...(newTags.length > 0 && { newTags })
    }

    const response = await BookmarkAPI.create(submitData) as any

    if (response?.flag) {
      emit('success')
      isOpen.value = false
    } else {
      console.error('添加书签失败:', response?.message)
      alert(response?.message || '添加书签失败')
    }
  } catch (error) {
    console.error('Failed to create bookmark:', error)
    alert('添加书签失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}

// 处理取消
const handleCancel = () => {
  isOpen.value = false
}

// 自动从剪切板获取URL
const autoFillFromClipboard = async () => {
  // 尝试读取剪切板内容
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const clipboardText = await navigator.clipboard.readText()
      const trimmedText = clipboardText.trim()

      // 检查剪切板内容是否是有效的URL
      if (trimmedText && (trimmedText.startsWith('http://') || trimmedText.startsWith('https://') || trimmedText.startsWith('www.'))) {
        // 如果是www开头，自动添加https://
        const url = trimmedText.startsWith('www.') ? `https://${trimmedText}` : trimmedText
        form.value.url = url
        console.log('从剪切板获取URL:', url)

        // 自动获取网页标题
        setTimeout(() => {
          fetchUrlMetadata()
        }, 100) // 延迟一点执行，确保URL已经设置
      }
    }
  } catch (error) {
    console.log('读取剪切板失败:', error)
    // 忽略剪切板读取错误，不影响用户体验
  }
}

// 获取URL元数据（标题和描述）
const fetchUrlMetadata = async () => {
  const url = form.value.url.trim()

  // 如果URL为空，则不自动获取
  if (!url) {
    return
  }

  try {
    isFetchingMetadata.value = true

    // 验证URL格式
    const urlObject = new URL(url.startsWith('http') ? url : `https://${url}`)

    // 发起请求获取页面内容
    const response = await fetch(urlObject.toString(), {
      method: 'GET',
      mode: 'cors',
    })

    if (response.ok) {
      const html = await response.text()

      // 只有在书签名称为空时才自动获取标题
      if (!form.value.name.trim()) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch && titleMatch[1]) {
          const title = titleMatch[1].trim()
          if (title) {
            form.value.name = title
            console.log('自动获取网页标题:', title)
          }
        }
      }

      // 只有在描述为空时才自动获取描述
      if (!form.value.description?.trim()) {
        // 尝试获取多种description meta标签
        const descriptionPatterns = [
          /<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i,
          /<meta\s+content=["']([^"']*?)["'][^>]*\s+name=["']description["']/i,
          /<meta\s+property=["']og:description["']\s+content=["']([^"']*?)["'][^>]*>/i,
          /<meta\s+name=["']twitter:description["']\s+content=["']([^"']*?)["'][^>]*>/i
        ]

        for (const pattern of descriptionPatterns) {
          const descMatch = html.match(pattern)
          if (descMatch && descMatch[1]) {
            const description = descMatch[1].trim()
            if (description && description.length > 10) { // 确保描述有意义
              form.value.description = description
              console.log('自动获取网页描述:', description)
              break
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('获取网页信息失败:', error)
    // 如果获取失败，尝试使用URL的域名作为名称（仅在名称为空时）
    if (!form.value.name.trim()) {
      try {
        const urlObject = new URL(url.startsWith('http') ? url : `https://${url}`)
        const hostname = urlObject.hostname.replace('www.', '')
        form.value.name = hostname
        console.log('使用域名作为书签名称:', hostname)
      } catch (urlError) {
        console.log('URL解析失败:', urlError)
      }
    }
  } finally {
    isFetchingMetadata.value = false
  }
}

// 检查是否为内网地址
const isInternalUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    const hostname = urlObj.hostname.toLowerCase()

    // 检查是否为localhost或本地IP
    const internalPatterns = [
      /^localhost(\:\d+)?$/,
      /^127\.0\.0\.1(\:\d+)?$/,
      /^0\.0\.0\.0(\:\d+)?$/,
      /^::1(\:\d+)?$/,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^169\.254\./,
      /^100\./,
      /^30\./
    ]

    return internalPatterns.some(pattern => pattern.test(hostname))
  } catch {
    return false
  }
}

// 检查是否为有效的网站URL
const isValidWebsiteUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)

    // 检查协议是否为http或https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false
    }

    // 检查hostname是否有效
    const hostname = urlObj.hostname
    if (!hostname || hostname.includes('..') || hostname.includes('//')) {
      return false
    }

    // 检查是否为常见的网站域名格式
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
    return domainPattern.test(hostname)
  } catch {
    return false
  }
}

// 解析标签字符串，提取名称和颜色
const parseTagString = (tagStr: string): { name: string; color: string; isNew: boolean } => {
  const parts = tagStr.split(':')
  const name = parts[0] || ''
  const isNew = parts[1] === 'new'
  const color = parts[2] || '#3b82f6'

  return { name, color, isNew }
}

// 存储完整的AI分析结果用于提交
const aiAnalysisSpaces = ref<string>('')
const aiAnalysisTags = ref<string[]>([])


// 处理流式分析结果
const processAnalysisResult = async (analysisData: NewWebsiteAnalysisResponse) => {
  // 存储分析结果用于提交
  aiAnalysisSpaces.value = analysisData.spaces || ''
  aiAnalysisTags.value = analysisData.tags || []

  // 获取当前所有的空间和标签
  const [spacesResponse, tagsResponse] = await Promise.all([
    SpaceAPI.getAllList(),
    TagAPI.getAllList()
  ])

  const spacesData = spacesResponse as any
  const tagsData = tagsResponse as any

  const spaces = spacesData?.data?.records || spacesData?.data || []
  const tags = tagsData?.data || []

  // 处理基本信息填充 - AI分析结果总是覆盖表单值
  if (analysisData.name) {
    form.value.name = analysisData.name
  }
  if (analysisData.description) {
    form.value.description = analysisData.description
  }

  // 分析完成后显示一个简短的成功提示
  setTimeout(() => {
    console.log('AI分析完成，结果已应用到表单')
  }, 100)

  // 处理空间匹配，包括new标记的空间
  if (analysisData.spaces && analysisData.spaces.trim()) {
    const spaceParts = analysisData.spaces.split(':')
    const spaceName = spaceParts[0]?.trim()
    const isSpaceNew = spaceParts[1] === 'new'

    if (spaceName) {
      const matchedSpace = spaces.find((s: SpaceResp) =>
        s.name.toLowerCase() === spaceName.toLowerCase()
      )

      if (matchedSpace) {
        form.value.namespaceId = matchedSpace.id
      } else if (isSpaceNew) {
        // 新空间，使用完整标识符作为ID，名称部分作为显示名称
        form.value.namespaceId = analysisData.spaces
      }
    }
  }

  // 处理标签匹配，包括new标记的标签
  if (analysisData.tags && Array.isArray(analysisData.tags) && analysisData.tags.length > 0) {
    // 保留当前已选择的标签
    const finalSelectedTagIds = new Set<string>(selectedTags.value)

    for (const tagStr of analysisData.tags) {
      if (tagStr && tagStr.trim()) {
        const { name: tagName, isNew } = parseTagString(tagStr)

        if (tagName) {
          const matchedTag = tags.find((t: TagResp) =>
            t.name.toLowerCase() === tagName.toLowerCase()
          )

          if (matchedTag) {
            finalSelectedTagIds.add(matchedTag.id)
          } else if (isNew) {
            // 新标签，使用完整标识符作为ID
            finalSelectedTagIds.add(tagStr)
          }
        }
      }
    }

    // 设置已匹配的标签，保留现有选择
    selectedTags.value = Array.from(finalSelectedTagIds)
  }

  // AI分析完成，直接应用到输入框，无需确认对话框
}

// 检查ID是否为new标记的标识符
const isNewMarkerId = (id: string): boolean => {
  return id.includes(':new')
}

// 提取新项目的显示名称
const extractDisplayName = (fullId: string): string => {
  if (isNewMarkerId(fullId)) {
    const parts = fullId.split(':')
    return parts[0]?.trim() || fullId
  }
  return fullId
}

// 从表单数据中提取新空间和新标签用于提交
const extractNewItemsForSubmission = () => {
  const newTags: { name: string; color: string }[] = []
  let newSpace: { name: string } | null = null

  // 检查空间是否为新项目
  if (form.value.namespaceId && isNewMarkerId(form.value.namespaceId)) {
    const spaceName = extractDisplayName(form.value.namespaceId)
    newSpace = { name: spaceName }
  }

  // 检查标签是否为新项目
  if (selectedTags.value.length > 0) {
    for (const tagId of selectedTags.value) {
      if (isNewMarkerId(tagId)) {
        const { name, color } = parseTagString(tagId)
        if (name) {
          newTags.push({ name, color })
        }
      }
    }
  }

  return { newSpace, newTags }
}

// AI 智能分析（流式版本，支持认证）
const handleAIAnalysis = async () => {
  const url = form.value.url.trim()

  if (!url) {
    alert('请先输入网址')
    return
  }

  // 检查是否为内网地址
  if (isInternalUrl(url)) {
    alert('不支持分析内网地址')
    return
  }

  // 检查是否为有效的网站URL
  if (!isValidWebsiteUrl(url)) {
    alert('请输入有效的网站网址')
    return
  }

  // 清空已选择的空间和标签，为AI分析结果做准备
  form.value.namespaceId = ''
  selectedTags.value = []

  // 如果已经在分析中，标记为中止
  if (isAnalyzing.value) {
    isAnalysisAborted.value = true
    isAnalyzing.value = false
    analysisStatus.value = ''
    return
  }

  try {
    isAnalyzing.value = true
    isAnalysisAborted.value = false
    analysisStatus.value = '正在连接分析服务...'

    // 使用fetch实现SSE，支持认证
    await WebsiteAnalysisAPI.analyzeWebsiteStream(
      url,
      // onStatus
      (message: string) => {
        if (!isAnalysisAborted.value) {
          analysisStatus.value = message
        }
      },
      // onBasicInfo
      (data: any) => {
        if (!isAnalysisAborted.value) {
          // 立即填充网站基本信息，提升用户体验 - AI分析结果总是覆盖表单值
          if (data.name) {
            form.value.name = data.name
          }
          if (data.description) {
            form.value.description = data.description
          }
        }
      },
      // onResult
      async (data: any) => {
        if (!isAnalysisAborted.value) {
          analysisStatus.value = '分析完成，正在处理结果...'

          // 处理完整的分析结果
          await processAnalysisResult(data)

          // 清理状态
          analysisStatus.value = ''
          isAnalyzing.value = false
        }
      },
      // onError
      (message: string) => {
        console.error('分析错误:', message)
        if (!isAnalysisAborted.value) {
          alert(message || '分析过程中发生错误')

          // 清理状态
          analysisStatus.value = ''
          isAnalyzing.value = false
        }
      }
    )

  } catch (error: any) {
    console.error('启动分析失败:', error)
    if (!isAnalysisAborted.value) {
      alert(error?.message || '启动分析失败，请稍后重试')
    }

    // 清理状态
    analysisStatus.value = ''
    isAnalyzing.value = false
  }
}

</script>