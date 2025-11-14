<script setup lang="tsx">
import { message, Modal } from "ant-design-vue";
import { Card } from "ant-design-vue";
import { onMounted, ref } from "vue";
import type { ModelRecord } from "../../public/types";
import ModelRenderer from "../components/ModelRenderer.vue";

const models = ref<ModelRecord[]>([]);
const modalOpen = ref(false);
const modelShow = ref<{
  glbFileUrl: string;
  buffer: ArrayBuffer;
}>();

onMounted(async () => {
  try {
    models.value = await window.ipcRenderer.invoke("get-all-models");
    console.log(models.value);
  } catch (error) {
    message.error("模型列表获取失败，请重试");
  }
});

const viewModel = async (model: ModelRecord) => {
  modelShow.value = await window.ipcRenderer.invoke("download-and-extract-model", model.url);
  modalOpen.value = true;
  // Modal.info({
  //   title: "查看模型",
  //   content: () => (
  //     <div class="model-renderer">
  //       <ModelRenderer model={modelShow} />
  //     </div>
  //   ),
  //   onOk() {
  //     console.log("closed model view", modelShow.glbFileUrl);
  //   },
  // });
};
</script>

<template>
  <main id="management">
    <h2>3D模型管理</h2>
    <div id="management-grid">
      <Card
        v-for="model in models"
        :key="model.cacheKey"
        class="model-card"
        hoverable
        :title="model.cacheKey"
        :bordered="false"
      >
        <p>创建时间: {{ new Date(model.timestamp).toLocaleString() }}</p>
        <template #extra><a @click="viewModel(model)">查看</a></template>
      </Card>
    </div>
    <Modal v-model:open="modalOpen" title="查看模型">
      <div class="model-renderer">
        <ModelRenderer :model="modelShow" />
      </div>
    </Modal>
  </main>
</template>

<style lang="css" scoped>
#management {
  padding: 20px;
}

#management h2 {
  margin-bottom: 24px;
  color: #1890ff;
}

#management-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.model-card {
  transition: all 0.3s ease;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.model-renderer {
  /* width: 100%; */
  height: 300px;
}
</style>
