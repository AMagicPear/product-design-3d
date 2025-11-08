<script setup lang="ts">
import { ref } from "vue";
import { message } from "ant-design-vue";
import { generatedImages } from "../stores/images";

// 定义响应式数据
const description = ref<string>();
const generateCount = ref("4"); // 默认生成4张

const isGenerating = ref(false);

// 模拟生成图片的函数
const generateImages = async () => {
  console.log(description.value?.length);
  if (!description.value || description.value.trim().length === 0) {
    message.error("请输入图片描述");
    return;
  }

  isGenerating.value = true;
  generatedImages.value = [];

  try {
    const count = parseInt(generateCount.value);


    // generatedImages.value = mockImages;
    message.success(`成功生成${count}张图片`);
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
            v-model="generateCount"
            style="width: 150px"
            placeholder="选择生成数量"
          >
            <a-select-option value="1">1张</a-select-option>
            <a-select-option value="2">2张</a-select-option>
            <a-select-option value="4">4张</a-select-option>
            <a-select-option value="6">6张</a-select-option>
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
        <div class="image-grid" v-if="generatedImages.length > 0">
          <a-image
            v-for="(image, index) in generatedImages"
            :key="index"
            :src="image"
            :preview="{ visible: false }"
            class="generated-image"
          />
        </div>
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

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.empty-state,
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
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
