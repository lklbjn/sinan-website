<script setup lang="ts">
import { computed } from 'vue';
import * as icons from "lucide-vue-next";

interface Props {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  defaultClass?: string;
}

const props = defineProps<Props>();

const icon = computed(() => {
  const iconComponent = (icons as any)[props.name];
  return iconComponent && typeof iconComponent === 'function' ? iconComponent : null;
});
</script>

<template>
  <component
      v-if="icon"
      :is="icon"
      :size="props.size"
      :color="props.color"
      :stroke-width="props.strokeWidth" 
      :default-class="props.defaultClass"
  />
</template>