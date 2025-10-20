<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>意见反馈</DialogTitle>
        <DialogDescription>
          请告诉我们您的想法或遇到的问题，我们会认真对待每一份反馈。
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="grid gap-4 py-4">
        <!-- 联系方式 -->
        <div class="grid gap-2">
          <Label for="contact">联系方式 *</Label>
          <Input
            id="contact"
            v-model="form.contact"
            type="text"
            placeholder="请输入邮箱或手机号"
            required
            :maxlength="100"
          />
          <div class="text-xs text-muted-foreground">
            我们可能需要通过邮箱或手机号与您联系以获取更多信息
          </div>
        </div>

        <!-- 反馈内容 -->
        <div class="grid gap-2">
          <Label for="content">反馈内容 *</Label>
          <Textarea
            id="content"
            v-model="form.content"
            placeholder="请详细描述您的问题、建议或想法..."
            required
            :maxlength="2000"
            rows="6"
            class="resize-none"
          />
          <div class="text-xs text-muted-foreground text-right">
            {{ form.content.length }}/2000
          </div>
        </div>
      </form>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          @click="closeDialog"
          :disabled="isSubmitting"
        >
          取消
        </Button>
        <Button
          type="submit"
          @click="handleSubmit"
          :disabled="isSubmitting || !isFormValid"
        >
          <span v-if="isSubmitting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></span>
          {{ isSubmitting ? '提交中...' : '提交反馈' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { FeedbackAPI } from '@/services/api'
import type { CreateFeedbackReq } from '@/types/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useNotification } from '@/composables/useNotification'

interface Props {
  open: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { success, error } = useNotification()

// 表单数据
const form = ref<CreateFeedbackReq>({
  contact: '',
  content: ''
})

// 提交状态
const isSubmitting = ref(false)

// 对话框打开状态
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// 表单验证
const isFormValid = computed(() => {
  return form.value.contact.trim() && form.value.content.trim() &&
         form.value.content.length <= 2000 && form.value.contact.length <= 100
})

// 监听对话框关闭，重置表单
watch(isOpen, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})

// 重置表单
const resetForm = () => {
  form.value = {
    contact: '',
    content: ''
  }
}

// 关闭对话框
const closeDialog = () => {
  isOpen.value = false
}

// 处理提交
const handleSubmit = async () => {
  if (!isFormValid.value || isSubmitting.value) {
    return
  }

  try {
    isSubmitting.value = true

    const response = await FeedbackAPI.create({
      contact: form.value.contact.trim(),
      content: form.value.content.trim()
    })

    if (response.code === 0) {
      success('感谢您的反馈，我们会尽快处理并回复您！', '反馈提交成功')
      closeDialog()
    } else {
      error(response.message || '提交失败，请稍后重试', '提交失败')
    }
  } catch (error: any) {
    console.error('提交反馈失败:', error)
    error(error.message || '网络错误，请稍后重试', '提交失败')
  } finally {
    isSubmitting.value = false
  }
}
</script>