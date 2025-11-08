<script setup lang="ts">
import { ref, watch } from "vue";
import { message } from "ant-design-vue";
import { generatedImages } from "../stores/images";

// 定义响应式数据
const description = ref<string>();
const sequentialImageGeneration = ref("auto");

const isGenerating = ref(false);

watch(sequentialImageGeneration, (newCount) => {
  console.log("sequentialImageGeneration changed:", newCount);
});

// 生成图片的函数 - 通过IPC调用主进程的API功能
const generateImages = async () => {
  if (!description.value || description.value.trim().length === 0) {
    message.error("请输入图片描述");
    return;
  }

  isGenerating.value = true;
  generatedImages.value = [];

  try {
    // 通过IPC调用主进程的API功能
    const images = await window.ipcRenderer.invoke(
      "generate-images",
      description.value,
      sequentialImageGeneration.value
    );
    console.log("Generated images:", images);
    generatedImages.value = images;
    message.success(`成功生成${images.length}张图片`);
  } catch (error) {
    message.error("生成图片失败，请稍后重试");
    console.error("生成图片失败:", error);
  } finally {
    isGenerating.value = false;
  }
};
</script>

<template>
  <div id="generate">
    <div class="generate-container">
      <!-- 左侧文本输入区域 -->
      <div class="input-section">
        <h2>输入描述</h2>
        <a-textarea
          v-model:value="description"
          show-count
          placeholder="请输入您想要生成的产品描述..."
          :rows="10"
        />
        <div class="control-panel">
          <a-select
            v-model:value="sequentialImageGeneration"
            style="width: 150px"
            placeholder="选择生成方式"
          >
            <a-select-option value="disabled">仅生成1张</a-select-option>
            <a-select-option value="auto">自动决定数量</a-select-option>
          </a-select>
          <a-button
            type="primary"
            @click="generateImages"
            :loading="isGenerating"
            class="generate-button"
          >
            生成图片
          </a-button>
        </div>
      </div>

      <!-- 右侧图片显示区域 -->
      <div class="image-section">
        <h2>生成结果</h2>
        <a-image-preview-group v-if="generatedImages.length > 0">
          <a-image
            v-for="(image, index) in generatedImages"
            :key="index"
            :src="image"
          />
        </a-image-preview-group>
        <div v-else-if="!isGenerating" class="empty-state">
          <p>暂无生成的图片，请输入描述并点击生成按钮</p>
        </div>
        <div v-else class="loading-state">
          <a-spin tip="正在生成图片...">
            <div class="loading-content"></div>
          </a-spin>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#generate {
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
}

.generate-container {
  display: flex;
  gap: 20px;
  height: calc(100vh - 150px);
}

.input-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-panel {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 10px;
}

.generate-button {
  flex: 1;
}

.image-section {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.empty-state,
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  border: 1px dashed #d9d9d9;
  border-radius: 20px;
  min-height: 300px;
}

.loading-content {
  width: 100px;
  height: 100px;
}

h2 {
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 600;
}
</style>
