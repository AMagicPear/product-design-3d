<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';

// 定义响应式数据
const description = ref('');
const generateCount = ref('4'); // 默认生成4张
const generatedImages = ref<string[]>([]);
const isGenerating = ref(false);

// 模拟生成图片的函数
const generateImages = async () => {
  if (!description.value.trim()) {
    message.error('请输入图片描述');
    return;
  }

  isGenerating.value = true;
  generatedImages.value = [];

  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟生成图片数据（实际项目中应该调用真实的AI图像生成API）
    const count = parseInt(generateCount.value);
    const mockImages: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // 使用占位图像服务生成随机图片
      mockImages.push(`https://picsum.photos/seed/${Date.now() + i}/600/400`);
    }

    generatedImages.value = mockImages;
    message.success(`成功生成${count}张图片`);
  } catch (error) {
    message.error('生成图片失败，请稍后重试');
    console.error('生成图片失败:', error);
  } finally {
    isGenerating.value = false;
  }
};

// 下载图片
const downloadImage = (imageUrl: string) => {
  // 创建一个临时的a标签用于下载
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `generated-image-${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  message.success('图片下载成功');
};

// 删除图片
const deleteImage = (index: number) => {
  generatedImages.value.splice(index, 1);
  message.success('图片已删除');
};
</script>

<template>
  <div id="generate">
    <div class="generate-container">
      <!-- 左侧文本输入区域 -->
      <div class="input-section">
        <h2>输入描述</h2>
        <a-textarea
          v-model="description"
          placeholder="请输入您想要生成的图片描述..."
          :rows="10"
          class="description-textarea"
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
          <div 
            v-for="(image, index) in generatedImages" 
            :key="index" 
            class="image-item"
          >
            <a-image
              :src="image"
              :preview="{ visible: false }"
              class="generated-image"
            />
            <div class="image-actions">
              <a-button 
                type="text"
                icon="download"
                @click="downloadImage(image)"
              >
                下载
              </a-button>
              <a-button 
                type="text"
                icon="delete"
                @click="deleteImage(index)"
              >
                删除
              </a-button>
            </div>
          </div>
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

.description-textarea {
  resize: none;
  border-radius: 8px;
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.image-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.image-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.generated-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.image-actions {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background-color: #fafafa;
}

.empty-state, .loading-state {
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