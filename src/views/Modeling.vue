<script setup lang="ts">
import { ref, watch } from "vue";
import { currentImageUrl } from "../stores/images";
import { message } from "ant-design-vue";
import ModelRenderer from "../components/ModelRenderer.vue";
import { modelTaskId } from "../stores/models";

// 3D模型加载状态
const isLoadingModel = ref(false);
const isDownloading = ref(false);
const modelUrl = ref<string>();

// 模拟3D模型加载函数
const startGenerateTask = async () => {
  if (!currentImageUrl.value) {
    message.warning("未选择图片，请先在生成页面选择图片");
    return;
  }

  isLoadingModel.value = true;
  try {
    const responseData = await window.ipcRenderer.invoke(
      "generate-model",
      currentImageUrl.value
    );
    modelTaskId.value = responseData.id as string;
    message.success("模型生成任务创建成功");
  } catch (error) {
    message.error("模型生成任务创建失败，请重试");
  } finally {
    isLoadingModel.value = true;
  }
};

const testF = () => {
  modelTaskId.value = "cgt-20251108161302-2bgvw";
  isLoadingModel.value = true;
};

watch(
  modelTaskId,
  async (newTaskId) => {
    if (newTaskId) {
      try {
        let content = await window.ipcRenderer.invoke(
          "get-model-status",
          newTaskId
        );
        console.log(content);
        isLoadingModel.value = false;
        isDownloading.value = true;
        let model = await window.ipcRenderer.invoke(
          "download-and-extract-model",
          content.file_url
        );
        modelUrl.value = model.glbFileUrl;
        isDownloading.value = false;
        console.log("downloaded model", model);
      } catch (error) {
        message.error("模型下载失败，请重试");
        isDownloading.value = false;
        isDownloading.value = false;
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <div id="modeling">
    <h2>3D模型预览</h2>
    <div class="modeling-container">
      <!-- 左侧当前选中图片 -->
      <div class="image-preview">
        <h3>原始图片</h3>
        <div v-if="currentImageUrl" class="image-container">
          <img
            :src="currentImageUrl"
            alt="当前选中图片"
            class="selected-image"
          />
        </div>
        <div v-else class="no-image">
          <p>未选择图片，请先在生成页面选择图片</p>
        </div>
      </div>

      <!-- 右侧3D模型预览 -->
      <div class="model-preview">
        <h3>3D模型</h3>
        <div class="model-container">
          <div v-if="isLoadingModel" class="loading-model">
            <a-spin tip="正在生成3D模型..."> </a-spin>
          </div>
          <div v-else-if="isDownloading" class="loading-model">
            <a-spin tip="正在下载模型..."> </a-spin>
          </div>
          <div v-else class="model-display">
            <ModelRenderer :model-url="modelUrl" />
          </div>
        </div>
        <div class="model-controls">
          <a-button type="default" @click="testF"> 测试 </a-button>
          <a-button type="default" @click="modelUrl = undefined; modelTaskId = undefined"> 清除 </a-button>
          <a-button
            type="default"
            @click="startGenerateTask"
            :loading="isLoadingModel"
          >
            开始生成模型
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#modeling {
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
}

.modeling-container {
  display: flex;
  gap: 20px;
  height: calc(100vh - 200px);
}

.image-preview,
.model-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.image-container,
.model-container {
  flex: 1;
  border: 1px dashed #d9d9d9;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 300px;
}

.selected-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.no-image,
.loading-model {
  color: #ccc;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.no-image:hover,
.loading-model:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* 修改加载中的文本样式 */
:deep(.ant-spin-text) {
  color: #ccc !important;
  font-size: 14px;
  margin-top: 10px;
}

.model-display {
  width: 100%;
  height: 100%;
}

.model-placeholder {
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.model-controls {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

h2 {
  margin-bottom: 10px;
  font-size: 20px;
  font-weight: 600;
}

h3 {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 500;
  color: #ccc;
}
</style>
