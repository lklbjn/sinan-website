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
          <Input
              id="url"
              v-model="form.url"
              type="url"
              placeholder="https://example.com"
              required
              @blur="fetchUrlMetadata"
          />
        </div>

        <!-- 名称 -->
        <div class="grid gap-2">
          <Label for="name">名称 *</Label>
          <Input
              id="name"
              v-model="form.name"
              placeholder="请输入书签名称"
              required
          />
        </div>

        <!-- 描述 -->
        <div class="grid gap-2">
          <Label for="description">描述</Label>
          <Textarea
              id="description"
              v-model="form.description"
              placeholder="请输入书签描述（可选）"
              class="max-h-20 resize-none"
              rows="3"
          />
        </div>

        <!-- 空间选择 -->
        <div class="grid gap-2">
          <Label for="space">空间</Label>
          <SpaceSelector v-model="form.namespaceId" />
        </div>

        <!-- 标签选择 -->
        <div class="grid gap-2">
          <Label>标签</Label>
          <TagSelector v-model="selectedTags" />
        </div>
      </form>

      <AlertDialogFooter class="flex gap-2">
        <AlertDialogCancel @click="handleCancel">
          取消
        </AlertDialogCancel>
        <AlertDialogAction
            @click="handleSubmit"
            :disabled="isSubmitting || !form.name.trim() || !form.url.trim()"
        >
          <span v-if="isSubmitting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
          {{ isSubmitting ? '添加中...' : '确认添加' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue'
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
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import SpaceSelector from './SpaceSelector.vue'
import TagSelector from './TagSelector.vue'
import {BookmarkAPI} from '@/services/api'
import type {AddBookmarkReq} from '@/types/api'

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
const selectedTags = ref<string[]>([])

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
}


// 处理表单提交
const handleSubmit = async () => {
  if (!form.value.name.trim() || !form.value.url.trim()) {
    return
  }

  try {
    isSubmitting.value = true

    // 准备提交数据，过滤空值
    const submitData: AddBookmarkReq = {
      name: form.value.name.trim(),
      url: form.value.url.trim(),
      ...(form.value.description?.trim() && {description: form.value.description.trim()}),
      ...(form.value.namespaceId && {namespaceId: form.value.namespaceId}),
      ...(selectedTags.value.length > 0 && {tagsIds: selectedTags.value})
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

</script>