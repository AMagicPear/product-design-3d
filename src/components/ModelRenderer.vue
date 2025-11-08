<script setup lang="ts">
import { onMounted, onBeforeUnmount, useTemplateRef, watch, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 定义组件属性
const props = defineProps<{
  modelUrl?: string;
}>();

const modelContainer = useTemplateRef('modelContainer');
const loading = ref(false);
const error = ref<string | null>(null);

// THREE.js 核心对象
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let model: THREE.Object3D | null = null;
let animateId: number | null = null;
let ambientLight: THREE.AmbientLight | null = null;
let directionalLight: THREE.DirectionalLight | null = null;

// 初始化场景
const initScene = () => {
  if (!modelContainer.value) {
    return;
  }

  // 创建场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x181A1F);

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    modelContainer.value.clientWidth / modelContainer.value.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(modelContainer.value.clientWidth, modelContainer.value.clientHeight);
  modelContainer.value.appendChild(renderer.domElement);

  // 添加灯光
  ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // 添加坐标轴辅助（可选）
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // 添加网格辅助（可选）
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add(gridHelper);

  // 添加控制器
  if (camera && renderer) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.5;
  }

  // 处理窗口大小变化
  window.addEventListener('resize', onWindowResize);
};

// 加载 GLB 模型
const loadModel = (url: string) => {
  if (!scene) return;
  console.log("loading model", url);
  loading.value = true;
  error.value = null;

  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      // 清除之前的模型
      if (model && scene) {
        scene.remove(model);
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((mat) => mat.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
      }

      model = gltf.scene;
      scene?.add(model);

      // 自动调整相机位置以适应模型
      if (camera) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // 稍微拉远一点，让模型更舒适地显示

        camera.position.z = cameraZ;
        camera.position.x = center.x;
        camera.position.y = center.y;

        if (controls) {
          controls.target.set(center.x, center.y, center.z);
          controls.update();
        }
      }

      loading.value = false;
    },
    (xhr) => {
      // 可以添加进度条逻辑
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (err) => {
      console.error('Failed to load model:', err);
      error.value = '模型加载失败，请检查URL是否正确';
      loading.value = false;
    }
  );
};

// 窗口大小变化处理
const onWindowResize = () => {
  if (!camera || !renderer || !modelContainer.value) return;

  camera.aspect = modelContainer.value.clientWidth / modelContainer.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(modelContainer.value.clientWidth, modelContainer.value.clientHeight);
};

// 动画循环
const animate = () => {
  animateId = requestAnimationFrame(animate);

  if (controls) {
    controls.update();
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
};

// 组件挂载时初始化
onMounted(() => {
  if (modelContainer.value) {
    initScene();
    animate();
  }
});

// 组件卸载时清理
onBeforeUnmount(() => {
  if (animateId) {
    cancelAnimationFrame(animateId);
  }

  if (controls) {
    controls.dispose();
  }

  if (renderer) {
    renderer.dispose();
    if (modelContainer.value && renderer.domElement.parentNode) {
      modelContainer.value.removeChild(renderer.domElement);
    }
  }

  window.removeEventListener('resize', onWindowResize);

  // 清理场景中的对象
  if (scene) {
    while (scene.children.length > 0) {
      const child = scene.children[0];
      scene.remove(child);
    }
  }
});

// 监听 modelUrl 变化，重新加载模型
watch(
  () => props.modelUrl,
  (newUrl) => {
    if (newUrl) {
      loadModel(newUrl);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="model-renderer-container">
    <div ref="modelContainer" class="model-container"></div>
    
    <!-- 加载状态指示器 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>加载模型中...</p>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="error" class="error-overlay">
      <p class="error-message">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.model-renderer-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.model-container {
  width: 100%;
  height: 100%;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #e74c3c;
  font-size: 16px;
  margin: 0;
  text-align: center;
  padding: 20px;
}
</style>