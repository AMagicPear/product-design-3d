<script setup lang="ts">
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';
import type { ModelRecord } from '../../public/types';

const models = ref<ModelRecord[]>([]);
onMounted(async () => {
  try {
    models.value = await window.ipcRenderer.invoke("get-all-models");
    console.log(models.value);
  } catch (error) {
    message.error("模型列表获取失败，请重试");
  }
});
</script>

<template>
  <main id="management">
    <h2>3D模型管理</h2>
    <div id="management-grid">
      <div v-for="model in models" :key="model.cacheKey">
        <p>{{ model.url }}</p>
        <p>{{ model.cacheKey }}</p>
        <p>{{ model.timestamp }}</p>
      </div>
    </div>
  </main>
</template>

<style lang="css" scoped>
#management-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
</style>
