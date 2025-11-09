<script setup lang="ts">
import { ref, watch } from "vue";
import { message } from "ant-design-vue";
import { useRouter } from 'vue-router';
import { generatedImages, currentImageUrl } from "../stores/images";

const router = useRouter();
const description = ref<string>();
const sequentialImageGeneration = ref("auto");
const isGenerating = ref(false);

watch(sequentialImageGeneration, (newCount) => {
  console.log("sequentialImageGeneration changed:", newCount);
});

function imageChanged(current: number) {
  currentImageUrl.value = generatedImages.value[current];
}

// 生成图片的函数 - 通过IPC调用主进程的API功能
const generateImages = async () => {
  if (!description.value || description.value.trim().length === 0) {
    message.error("请输入图片描述");
    return;
  }

  isGenerating.value = true;
  generatedImages.value = [];
  currentImageUrl.value = undefined;

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
    currentImageUrl.value = generatedImages.value[0];
  } catch (error) {
    message.error("生成图片失败，请稍后重试");
    console.error("生成图片失败:", error);
  } finally {
    isGenerating.value = false;
  }
};

// 跳转到建模页面的函数
const navigateToModeling = () => {
  if (!currentImageUrl.value) {
    message.warning('请先选择一张图片');
    return;
  }
  router.push('/modeling');
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
        <div class="modeling-button-container">
          <a-button
            type="default"
            @click="navigateToModeling"
            class="modeling-button"
            :disabled="!currentImageUrl"
          >
            以当前图片生成模型
          </a-button>
        </div>
      </div>

      <!-- 右侧图片显示区域 -->
      <div class="image-section">
        <h2>生成结果</h2>
        <a-carousel
          arrows
          dots-class="slick-dots slick-thumb"
          v-if="generatedImages.length"
          :after-change="imageChanged"
        >
          <div v-for="image in generatedImages">
            <img :src="image" />
          </div>
        </a-carousel>
        <div v-else-if="!isGenerating" class="empty-state">
          <p>暂无生成的图片，请输入描述并点击生成按钮</p>
        </div>
        <div v-else class="loading-state">
          <a-spin tip="正在生成图片...">
          </a-spin>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.slick-dots) {
  position: relative;
  height: auto;
}
:deep(.slick-slide img) {
  border: 5px solid transparent;
  display: block;
  margin: auto;
  max-width: 80%;
}
:deep(.slick-arrow) {
  display: none !important;
}
:deep(.slick-thumb) {
  bottom: 0px;
}
:deep(.slick-thumb li) {
  width: 60px;
  height: 45px;
}
:deep(.slick-thumb li img) {
  width: 100%;
  height: 100%;
  filter: grayscale(100%);
  display: block;
}
:deep(.slick-thumb li.slick-active img) {
  filter: grayscale(0%);
}

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


.modeling-button-container {
  margin-top: 10px;
}

:deep(.modeling-button-container button:disabled) {
  background-color: #f5f5f5;
  color: #999;
}

.modeling-button {
  width: 100%;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
  border: 1px dashed #555;
  border-radius: 20px;
  min-height: 300px;
  background: rgba(255, 255, 255, 0.03);
  padding: 20px;
  transition: all 0.3s ease;
}

.empty-state:hover,
.loading-state:hover {
  border-color: #777;
  background: rgba(255, 255, 255, 0.05);
}

/* 修改加载中的文本样式 */
:deep(.ant-spin-text) {
  color: #ccc !important;
  font-size: 14px;
  margin-top: 6px;
}

h2 {
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: 600;
}
</style>