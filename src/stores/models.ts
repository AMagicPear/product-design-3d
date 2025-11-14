import { ref } from "vue";

export const modelTaskId = ref<string>();
// 3D模型加载状态
export const isLoadingModel = ref(false);
export const isDownloading = ref(false);
export const modelContent = ref<{ glbFileUrl: string; buffer: ArrayBuffer }>()
