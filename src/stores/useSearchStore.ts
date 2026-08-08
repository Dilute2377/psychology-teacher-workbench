import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/** 顶栏与各列表页共用的短生命周期搜索状态。 */
export const useSearchStore = defineStore('search', () => {
  const searchKeyword = ref('')
  const normalizedKeyword = computed(() => searchKeyword.value.trim().toLocaleLowerCase())

  function setSearchKeyword(value: string) { searchKeyword.value = value }
  function clearSearch() { searchKeyword.value = '' }

  return { searchKeyword, normalizedKeyword, setSearchKeyword, clearSearch }
})
