<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  ArchiveRestore,
  BellRing,
  DatabaseZap,
  Download,
  Dices,
  FolderOpen,
  GraduationCap,
  Info,
  LockKeyhole,
  Plus,
  Rocket,
  Send,
  ShieldAlert,
  Settings2,
  Tags,
  Trash2,
  Upload,
} from "@lucide/vue";
import BackupRestoreModal from "../../components/system/BackupRestoreModal.vue";
import TermManagerModal from "../../components/system/TermManagerModal.vue";
import AcademicYearPromotionModal from "../../components/system/AcademicYearPromotionModal.vue";
import { useAppLockStore } from "../../stores/useAppLockStore";
import { useCategoryStore } from "../../stores/useCategoryStore";
import { useConsultationTemplateStore } from "../../stores/useConsultationTemplateStore";
import { useTermStore, type TermUsage } from "../../stores/useTermStore";
import { useSchoolConfigStore } from "../../stores/useSchoolConfigStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { feishuCards, sendFeishuCard } from "../../services/feishuService";
import { STAGE_LABELS, type SchoolStage } from "../../constants/grades";
import { clearMockDataOnly, factoryReset } from "../../services/resetService";
import { selectBackupFolder } from "../../services/backupService";
import { generateMockData } from "../../utils/mockDataGenerator";
import FactoryResetConfirmModal from "../../components/system/FactoryResetConfirmModal.vue";
import CrisisConfigPanel from "../../components/system/CrisisConfigPanel.vue";

type Tab =
  | "school"
  | "crisis"
  | "categories"
  | "terms"
  | "security"
  | "backup"
  | "feishu"
  | "about";
const activeTab = ref<Tab>("school");
const categoryStore = useCategoryStore();
const templateStore = useConsultationTemplateStore();
const appLock = useAppLockStore();
const termStore = useTermStore();
const schoolConfig = useSchoolConfigStore();
const settingsStore = useSettingsStore();
const newCategory = ref("");
const newWord = ref("");
const currentPin = ref("");
const newPin = ref("");
const confirmPin = ref("");
const securityMessage = ref("");
const feishuMessage = ref("");
const feishuTesting = ref(false);
const showTerms = ref(false);
const showPromotion = ref(false);
const backupAction = ref<"export" | "restore" | null>(null);
const developerMessage = ref("");
const mockBusy = ref(false);
const resetVisible = ref(false);
const usages = ref<Record<string, TermUsage>>({});
const tabs = [
  { id: "school" as const, label: "学校与教学配置", icon: Settings2 },
  { id: "crisis" as const, label: "预警体系配置", icon: ShieldAlert },
  { id: "categories" as const, label: "问题分类与词库", icon: Tags },
  { id: "terms" as const, label: "学期与升学", icon: GraduationCap },
  { id: "security" as const, label: "安全与锁屏", icon: LockKeyhole },
  { id: "backup" as const, label: "数据备份与恢复", icon: ArchiveRestore },
  { id: "feishu" as const, label: "飞书通知机器人", icon: BellRing },
  { id: "about" as const, label: "关于系统", icon: Info },
];
const categoryHint = computed(() => "已被历史咨询引用的分类会锁定保留。");
async function refreshTerms() {
  await termStore.fetchTerms();
  usages.value = Object.fromEntries(
    await Promise.all(
      termStore.allTerms.map(async (term) => [
        term.id,
        await termStore.getTermUsage(term.id),
      ]),
    ),
  );
}
async function addCategory() {
  if (await categoryStore.addCategory(newCategory.value))
    newCategory.value = "";
}
async function deleteCategory(name: string) {
  await categoryStore.deleteCategory(name);
}
async function addWord() {
  if (await templateStore.addObservationWord(newWord.value)) newWord.value = "";
}
async function savePin() {
  securityMessage.value = "";
  try {
    if (appLock.isConfigured && !(await appLock.verify(currentPin.value)))
      throw new Error("当前 PIN 不正确。");
    if (newPin.value !== confirmPin.value)
      throw new Error("两次新 PIN 输入不一致。");
    await appLock.setPin(newPin.value);
    currentPin.value = "";
    newPin.value = "";
    confirmPin.value = "";
    securityMessage.value = "本机 PIN 已保存。";
  } catch (error) {
    securityMessage.value =
      error instanceof Error ? error.message : "PIN 保存失败。";
  }
}
async function selectStage(stage: SchoolStage) {
  await schoolConfig.updateSchoolProfile({ enabledStages: [stage] });
}
function syncPeriods() {
  schoolConfig.resizeTeachingPeriods(
    schoolConfig.teachingProfile.morningPeriods,
    schoolConfig.teachingProfile.afternoonPeriods,
  );
}
async function saveTeachingProfile() {
  await schoolConfig.updateTeachingProfile({
    ...schoolConfig.teachingProfile,
    periods: schoolConfig.teachingProfile.periods.map((period) => ({
      ...period,
    })),
    lessonDurationMinutes:
      Number(schoolConfig.teachingProfile.lessonDurationMinutes) || 45,
    morningPeriods: Number(schoolConfig.teachingProfile.morningPeriods) || 0,
    afternoonPeriods:
      Number(schoolConfig.teachingProfile.afternoonPeriods) || 0,
  });
}
function showLaunchNotice() {
  window.dispatchEvent(new Event("show-launch-notice"));
}
async function saveFeishu() {
  await settingsStore.saveFeishuConfig({ ...settingsStore.feishuConfig });
  feishuMessage.value = "飞书通知配置已保存。";
}
async function testFeishu() {
  feishuTesting.value = true;
  feishuMessage.value = "";
  try {
    await settingsStore.saveFeishuConfig({ ...settingsStore.feishuConfig });
    await sendFeishuCard(settingsStore.feishuConfig, feishuCards.test());
    feishuMessage.value = "测试卡片已发送至飞书。";
  } catch (error) {
    feishuMessage.value =
      error instanceof Error ? error.message : "测试消息发送失败。";
  } finally {
    feishuTesting.value = false;
  }
}
async function generateMockStudents() {
  mockBusy.value = true; developerMessage.value = ""
  try { const result = await generateMockData(500); localStorage.setItem("mockDataGeneratedAt", new Date().toISOString()); developerMessage.value = `已成功注入 ${result.students} 名虚拟学生及关联记录！`; window.setTimeout(() => window.location.reload(), 900) } catch (error) { developerMessage.value = error instanceof Error ? error.message : "模拟数据生成失败。" } finally { mockBusy.value = false }
}
async function clearMockStudents() {
  mockBusy.value = true; developerMessage.value = ""
  try { const removed = await clearMockDataOnly(); const count = Object.values(removed).reduce((sum, value) => sum + value, 0); developerMessage.value = count ? `已清理 ${count} 条模拟数据，用户数据和系统配置已保留。` : "当前没有可清理的模拟数据。"; window.setTimeout(() => window.location.reload(), 700) } catch (error) { developerMessage.value = error instanceof Error ? error.message : "模拟数据清理失败。" } finally { mockBusy.value = false }
}
async function confirmFactoryReset() {
  mockBusy.value = true; developerMessage.value = ""
  try { await factoryReset(); resetVisible.value = false; developerMessage.value = "已恢复出厂设置，应用即将重新加载。"; window.setTimeout(() => window.location.reload(), 700) } catch (error) { developerMessage.value = error instanceof Error ? error.message : "恢复出厂失败。" } finally { mockBusy.value = false }
}
async function chooseAutoBackupFolder() {
  const result = await selectBackupFolder()
  if (result.canceled || !result.folderPath) return
  await settingsStore.saveAutoBackupSettings({ folderPath: result.folderPath })
}
async function saveAutoBackup() { await settingsStore.saveAutoBackupSettings({ enabled: settingsStore.autoBackupEnabled, intervalDays: settingsStore.autoBackupIntervalDays, folderPath: settingsStore.autoBackupFolderPath }); developerMessage.value = "自动备份配置已保存。" }
watch(() => schoolConfig.teachingProfile.morningPeriods, syncPeriods);
watch(() => schoolConfig.teachingProfile.afternoonPeriods, syncPeriods);
onMounted(async () => {
  await Promise.all([
    categoryStore.load(),
    templateStore.load(),
    appLock.load(),
    refreshTerms(),
    schoolConfig.load(),
    settingsStore.load(),
  ]);
});
</script>

<template>
  <div class="h-full overflow-y-auto bg-slate-50 p-6">
    <div class="mx-auto max-w-6xl">
      <p class="text-sm font-medium text-teal-700">系统设置</p>
      <h1 class="mt-1 text-2xl font-semibold text-stone-800">全局配置中心</h1>
      <nav
        class="mt-6 flex overflow-x-auto rounded-xl border border-stone-200 bg-white p-1.5"
        aria-label="系统设置页签"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium"
          :class="
            activeTab === tab.id
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-100'
          "
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="16" />{{ tab.label }}
        </button>
      </nav>
      <section v-if="activeTab === 'school'" class="mt-5 space-y-5">
        <article
          class="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <h2 class="font-semibold text-stone-800">学校类型与班级数初始化</h2>
          <p class="mt-2 text-sm text-stone-500">
            学校类型只能选择一个学段；选择后，仅该学段的年级与班级配置会进入全系统。
          </p>
          <fieldset class="mt-5 flex flex-wrap gap-3">
            <label
              v-for="(label, stage) in STAGE_LABELS"
              :key="stage"
              class="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
              :class="
                schoolConfig.schoolProfile.enabledStages[0] === stage
                  ? 'border-teal-300 bg-teal-50 text-teal-800'
                  : 'border-stone-200 text-stone-600'
              "
              ><input
                :checked="schoolConfig.schoolProfile.enabledStages[0] === stage"
                type="radio"
                name="school-stage"
                class="accent-teal-700"
                @change="selectStage(stage as SchoolStage)"
              />{{ label }}</label
            >
          </fieldset>
          <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label
              v-for="grade in schoolConfig.enabledGrades"
              :key="grade"
              class="rounded-xl border border-teal-100 bg-teal-50/30 p-3 text-sm font-medium text-stone-700"
              >{{ grade }} 最大班级数<input
                :value="schoolConfig.schoolProfile.classCountByGrade[grade]"
                min="1"
                max="99"
                type="number"
                class="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2"
                @change="
                  schoolConfig.setClassCount(
                    grade,
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              /><span class="mt-1 block text-xs font-normal text-stone-400"
                >将生成 1班 至
                {{
                  schoolConfig.schoolProfile.classCountByGrade[grade]
                }}班</span
              ></label
            >
          </div>
        </article>
        <article
          class="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="font-semibold text-stone-800">教学作息与单双周</h2>
              <p class="mt-2 text-sm text-stone-500">
                修改上午、下午节数后，下面表格会立即增减；保存后，周课表会严格采用相同节数。
              </p>
            </div>
            <button
              class="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
              @click="saveTeachingProfile"
            >
              保存教学配置
            </button>
          </div>
          <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label class="text-sm font-medium text-stone-700"
              >授课周期<select
                v-model="schoolConfig.teachingProfile.cycleMode"
                class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2"
              >
                <option value="weekly">每周一节（单色）</option>
                <option value="alternate">单双周轮换</option>
              </select></label
            ><label class="text-sm font-medium text-stone-700"
              >每节课时长（分钟）<input
                v-model.number="
                  schoolConfig.teachingProfile.lessonDurationMinutes
                "
                min="10"
                type="number"
                class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label
            ><label class="text-sm font-medium text-stone-700"
              >上午节数<input
                v-model.number="schoolConfig.teachingProfile.morningPeriods"
                min="0"
                max="12"
                type="number"
                class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label
            ><label class="text-sm font-medium text-stone-700"
              >下午节数<input
                v-model.number="schoolConfig.teachingProfile.afternoonPeriods"
                min="0"
                max="12"
                type="number"
                class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2"
            /></label>
          </div>
          <div class="mt-5 overflow-x-auto rounded-xl border border-stone-200">
            <table class="min-w-full text-sm">
              <thead class="bg-stone-50 text-left text-xs text-stone-500">
                <tr>
                  <th class="px-3 py-2">课时</th>
                  <th class="px-3 py-2">开始</th>
                  <th class="px-3 py-2">结束</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="period in schoolConfig.teachingProfile.periods"
                  :key="period.label"
                  class="border-t border-stone-100"
                >
                  <td class="px-3 py-2 font-medium text-stone-700">
                    {{ period.label }}
                  </td>
                  <td class="px-3 py-2">
                    <input
                      v-model="period.start"
                      type="time"
                      class="rounded border border-stone-200 px-2 py-1"
                    />
                  </td>
                  <td class="px-3 py-2">
                    <input
                      v-model="period.end"
                      type="time"
                      class="rounded border border-stone-200 px-2 py-1"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>
      <section v-else-if="activeTab === 'crisis'" class="mt-5 max-w-4xl">
        <CrisisConfigPanel />
      </section>
      <section
        v-else-if="activeTab === 'categories'"
        class="mt-5 grid gap-5 lg:grid-cols-2"
      >
        <article
          class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <h2 class="font-semibold text-stone-800">咨询问题分类</h2>
          <p class="mt-1 text-xs leading-5 text-stone-400">
            {{ categoryHint }}
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="category in categoryStore.categories"
              :key="category"
              class="inline-flex items-center gap-1 rounded-full bg-teal-50 py-1 pl-2.5 pr-1 text-sm text-teal-800"
              >{{ category
              }}<button
                type="button"
                :disabled="(categoryStore.usageCount[category] ?? 0) > 0"
                :title="
                  (categoryStore.usageCount[category] ?? 0) > 0
                    ? '该分类已有历史咨询，不能删除'
                    : `删除 ${category}`
                "
                class="rounded-full p-0.5 text-teal-500 hover:bg-white hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                @click="deleteCategory(category)"
              >
                <Trash2 :size="13" /></button
            ></span>
          </div>
          <div class="mt-5 flex gap-2">
            <input
              v-model="newCategory"
              class="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"
              placeholder="新增分类，例如：网络成瘾"
              @keyup.enter="addCategory"
            /><button
              type="button"
              class="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              @click="addCategory"
            >
              <Plus :size="15" />新增
            </button>
          </div>
        </article>
        <article
          class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <h2 class="font-semibold text-stone-800">SOAP 常用观察词</h2>
          <p class="mt-1 text-xs leading-5 text-stone-400">
            新增或删除后立即同步至新增咨询抽屉。
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="word in templateStore.observationWords"
              :key="word"
              class="inline-flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-2.5 pr-1 text-sm text-stone-700"
              >{{ word
              }}<button
                type="button"
                class="rounded-full p-0.5 text-stone-400 hover:bg-white hover:text-rose-600"
                :aria-label="`删除 ${word}`"
                @click="templateStore.deleteObservationWord(word)"
              >
                <Trash2 :size="13" /></button
            ></span>
          </div>
          <div class="mt-5 flex gap-2">
            <input
              v-model="newWord"
              class="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"
              placeholder="新增常用观察词"
              @keyup.enter="addWord"
            /><button
              type="button"
              class="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              @click="addWord"
            >
              <Plus :size="15" />新增
            </button>
          </div>
        </article>
      </section>
      <section
        v-else-if="activeTab === 'terms'"
        class="mt-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="font-semibold text-stone-800">学期与升学管理</h2>
            <p class="mt-2 text-sm leading-6 text-stone-500">
              学期是业务历史的时间坐标；有关联业务记录的历史学期会被安全保留。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100"
              @click="showTerms = true"
            >
              <Settings2 :size="16" />管理与新增学期</button
            ><button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              @click="showPromotion = true"
            >
              <Rocket :size="16" />开启新学年一键升学向导
            </button>
          </div>
        </div>
        <div class="mt-5 overflow-x-auto rounded-xl border border-stone-200">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th class="px-4 py-3">学期名称</th>
                <th class="px-4 py-3">时间范围</th>
                <th class="px-4 py-3">状态</th>
                <th class="px-4 py-3 text-right">关联业务记录</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="term in termStore.allTerms"
                :key="term.id"
                class="border-t border-stone-100"
              >
                <td class="px-4 py-3 font-medium text-stone-800">
                  {{ term.name }}
                </td>
                <td class="px-4 py-3 text-stone-500">
                  {{ term.startDate }} 至 {{ term.endDate }}
                </td>
                <td class="px-4 py-3">
                  <span
                    v-if="term.isCurrent"
                    class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                    >当前学期</span
                  ><span v-else class="text-xs text-stone-400">历史学期</span>
                </td>
                <td class="px-4 py-3 text-right text-stone-600">
                  {{ usages[term.id]?.total ?? 0 }} 条
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section
        v-else-if="activeTab === 'security'"
        class="mt-5 max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h2 class="font-semibold text-stone-800">安全与锁屏</h2>
        <p
          class="mt-2 text-sm leading-6"
          :class="appLock.isConfigured ? 'text-emerald-700' : 'text-amber-700'"
        >
          {{
            appLock.isConfigured
              ? "当前已设置应用锁 PIN 码。修改前请验证当前 PIN。"
              : "未设置 PIN 码。首次保存后，顶栏的数据锁将立即可用。"
          }}
        </p>
        <p
          v-if="securityMessage"
          class="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800"
        >
          {{ securityMessage }}
        </p>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <label
            v-if="appLock.isConfigured"
            class="text-sm font-medium text-stone-700"
            >当前 PIN<input
              v-model="currentPin"
              inputmode="numeric"
              maxlength="6"
              type="password"
              class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label
          ><label class="text-sm font-medium text-stone-700"
            >新 PIN（4-6 位数字）<input
              v-model="newPin"
              inputmode="numeric"
              maxlength="6"
              type="password"
              class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label
          ><label class="text-sm font-medium text-stone-700"
            >确认新 PIN<input
              v-model="confirmPin"
              inputmode="numeric"
              maxlength="6"
              type="password"
              class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2"
          /></label>
        </div>
        <div class="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            class="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            @click="savePin"
          >
            保存 PIN</button
          ><button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            @click="appLock.lock()"
          >
            <LockKeyhole :size="16" />立即测试锁屏
          </button>
        </div>
      </section>
      <section
        v-else-if="activeTab === 'backup'"
        class="mt-5 max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h2 class="font-semibold text-stone-800">全量备份与恢复</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <article class="rounded-xl border border-teal-100 bg-teal-50/40 p-4">
            <Download :size="20" class="text-teal-700" />
            <h3 class="mt-3 text-sm font-semibold text-stone-800">导出全量本地备份</h3>
            <button
              type="button"
              class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              @click="backupAction = 'export'"
            >
              <Download :size="15" />导出全量备份文件 (.mindbag)
            </button>
          </article>
          <article
            class="rounded-xl border border-amber-200 bg-amber-50/40 p-4"
          >
            <Upload :size="20" class="text-amber-800" />
            <h3 class="mt-3 text-sm font-semibold text-stone-800">
              恢复备份数据
            </h3>
            <button
              type="button"
              class="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              @click="backupAction = 'restore'"
            >
              <Upload :size="15" />选择备份文件并恢复
            </button>
          </article>
        </div>
        <article class="mt-5 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <div class="flex items-center gap-2"><FolderOpen :size="19" class="text-sky-700" /><h3 class="text-sm font-semibold text-slate-800">自动静默加密备份</h3></div>
          <p class="mt-1 text-xs text-slate-500">Electron 版静默落盘；Web/开发版下载文件。</p>
          <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]"><label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input v-model="settingsStore.autoBackupEnabled" type="checkbox" class="accent-emerald-600" />开启自动备份</label><label class="text-sm font-medium text-slate-700">间隔天数<input v-model.number="settingsStore.autoBackupIntervalDays" type="number" min="1" max="30" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" /></label></div>
          <div class="mt-3 flex flex-wrap items-center gap-2"><input :value="settingsStore.autoBackupFolderPath || '尚未选择目录（Electron 版请先选择）'" readonly class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500" /><button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100" @click="chooseAutoBackupFolder"><FolderOpen :size="14" />选择目录</button><button type="button" class="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800" @click="saveAutoBackup">保存</button></div>
          <p class="mt-2 text-[11px] text-slate-400">最近自动备份：{{ settingsStore.lastAutoBackupTime || '尚未执行' }}</p>
        </article>
        <article class="mt-5 rounded-xl border border-slate-300 bg-slate-900 p-5 text-white">
          <div class="flex items-center gap-2"><DatabaseZap :size="19" class="text-sky-300" /><div><h3 class="text-sm font-semibold">高级开发者与数据重置区</h3><p class="mt-1 text-xs text-slate-300">本地压测与恢复出厂。</p></div></div>
          <p v-if="developerMessage" class="mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs text-slate-100">{{ developerMessage }}</p>
          <div class="mt-4 flex flex-wrap gap-2"><button type="button" :disabled="mockBusy" class="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-400 disabled:opacity-50" @click="generateMockStudents"><Dices :size="15" />{{ mockBusy ? '处理中…' : '一键生成 500 名测试学生数据' }}</button><button type="button" :disabled="mockBusy" class="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-900/40 disabled:opacity-50" @click="clearMockStudents"><Trash2 :size="15" />仅清理模拟测试数据</button><button type="button" :disabled="mockBusy" class="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900/50 disabled:opacity-50" @click="resetVisible = true"><DatabaseZap :size="15" />恢复出厂设置</button></div>
        </article>
      </section>
      <section
        v-else-if="activeTab === 'feishu'"
        class="mt-5 max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <div class="flex items-center gap-2">
          <BellRing :size="19" class="text-sky-600" />
          <h2 class="font-semibold text-stone-800">飞书 Notification Bot</h2>
        </div>
        <details class="mt-4 rounded-xl border border-sky-100 bg-sky-50/60 p-4">
          <summary class="cursor-pointer text-sm font-semibold text-sky-900">如何创建并配置飞书自定义机器人？</summary>
          <ol class="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-sky-900">
            <li>电脑端打开飞书，创建群组并进入群组。</li>
            <li>打开“群组设置 → 群机器人 → 添加机器人”。</li>
            <li>选择“自定义机器人”，点击“添加”。</li>
            <li>复制生成的 <strong>Webhook 地址</strong>，粘贴到下方 Webhook 输入框。</li>
            <li>在飞书机器人设置中勾选“签名校验”，复制生成的签名校验密钥，粘贴到下方密钥输入框。</li>
            <li>开启推送选项后点击“保存飞书配置”，再点击“发送测试卡片消息”验证连接。</li>
          </ol>
        </details>
        <p
          v-if="feishuMessage"
          class="mt-4 rounded-lg px-3 py-2 text-sm"
          :class="
            feishuMessage.includes('已')
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-rose-50 text-rose-700'
          "
        >
          {{ feishuMessage }}
        </p>
        <label class="mt-5 block text-sm"
          >飞书 Webhook 地址 <span class="text-rose-500">*</span
          ><input
            v-model="settingsStore.feishuConfig.webhookUrl"
            class="mt-1.5 w-full rounded-lg border p-2"
            placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." /></label
        ><label class="mt-4 block text-sm"
          >签名校验密钥（可选）<input
            v-model="settingsStore.feishuConfig.secret"
            type="password"
            class="mt-1.5 w-full rounded-lg border p-2"
        /></label>
        <div class="mt-5 space-y-4 rounded-xl bg-slate-50 p-4 text-sm">
          <label class="flex items-center gap-2 font-semibold"
            ><input
              v-model="settingsStore.feishuConfig.enabled"
              type="checkbox"
            />开启飞书消息推送</label
          ><label class="flex items-center gap-2"
            ><input
              v-model="settingsStore.feishuConfig.notifyConsultation"
              type="checkbox"
            />提醒个体咨询：提前
            <input
              v-model.number="
                settingsStore.feishuConfig.consultationLeadMinutes
              "
              min="1"
              max="120"
              type="number"
              class="w-16 rounded border px-2 py-1"
            />
            分钟推送</label
          ><label class="flex items-center gap-2"
            ><input
              v-model="settingsStore.feishuConfig.notifyTeaching"
              type="checkbox"
            />提醒心理课上课：提前
            <input
              v-model.number="settingsStore.feishuConfig.teachingLeadMinutes"
              min="1"
              max="120"
              type="number"
              class="w-16 rounded border px-2 py-1"
            />
            分钟推送</label
          ><label class="flex flex-wrap items-center gap-2"
            ><input
              v-model="settingsStore.feishuConfig.dailyDigestEnabled"
              type="checkbox"
            />开启每日晨间日程汇总：每天
            <input
              v-model="settingsStore.feishuConfig.dailyDigestTime"
              type="time"
              class="rounded border px-2 py-1"
            />
            推送</label
          ><label class="flex items-center gap-2"
            ><input
              v-model="settingsStore.feishuConfig.notifyWorkTrail"
              type="checkbox"
            />提醒领导指令与工作留痕待办</label
          >
        </div>
        <div class="mt-5 flex gap-3">
          <button
            type="button"
            class="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"
            @click="saveFeishu"
          >
            保存飞书配置</button
          ><button
            type="button"
            :disabled="feishuTesting"
            class="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800"
            @click="testFeishu"
          >
            <Send :size="16" />{{
              feishuTesting ? "发送中…" : "发送测试卡片消息"
            }}
          </button>
        </div>
      </section>
      <section
        v-else
        class="mt-5 max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h2 class="font-semibold text-stone-800">关于系统</h2>
        <p class="mt-2 text-sm leading-6 text-stone-500">
          本地免费公益工具，请通过官方声明核验来源。
        </p>
        <p class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
          本软件为教学管理与工作留痕辅助工具，心理评估与危机干预请依据专业临床标准执行。数据默认保存在本机，备份文件使用 AES-256-GCM 加密，请妥善保管解密主密码并定期导出备份。
        </p>
        <button
          type="button"
          class="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          @click="showLaunchNotice"
        >
          <Info :size="16" />重新查看开源声明与赞赏码
        </button>
      </section>
    </div>
    <TermManagerModal
      v-if="showTerms"
      @close="
        showTerms = false;
        refreshTerms();
      "
    /><AcademicYearPromotionModal
      v-if="showPromotion"
      @close="
        showPromotion = false;
        refreshTerms();
      "
    /><BackupRestoreModal
      v-if="backupAction"
      :initial-action="backupAction"
      :folder-path="settingsStore.autoBackupFolderPath"
      @close="backupAction = null"
      @restored="backupAction = null"
    /><FactoryResetConfirmModal v-if="resetVisible" :busy="mockBusy" @cancel="resetVisible = false" @confirm="confirmFactoryReset" />
  </div>
</template>
