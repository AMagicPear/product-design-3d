import { createApp } from 'vue'
import App from './App.vue'
import './assets/base.css'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import router from './router'

createApp(App).use(router).use(Antd).mount('#app').$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
})
