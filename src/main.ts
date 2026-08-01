import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useTermStore } from './stores/useTermStore'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  await useTermStore(pinia).fetchTerms()
  app.use(router)
  app.mount('#app')
}

void bootstrap()
