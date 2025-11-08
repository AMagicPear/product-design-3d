import { createRouter, createWebHashHistory } from 'vue-router'
import Generate from './views/Generate.vue'
import Modeling from './views/Modeling.vue'
import Management from './views/Management.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/generate'
    },
    {
      path: '/generate',
      component: Generate
    },
    {
      path: '/modeling',
      component: Modeling
    },
    {
      path: '/management',
      component: Management
    }
  ]
})

export default router