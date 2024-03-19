<template>
  <ErrorBoundary>
    <!-- TODO: メニューバーをEditorHomeから移動する -->
    <KeepAlive>
      <Component
        :is="openedEditor == 'talk' ? TalkEditor : SingEditor"
        v-if="openedEditor != undefined"
        :key="openedEditor"
        :is-engines-ready="isEnginesReady"
        :is-project-file-loaded="isProjectFileLoaded"
        :get-live2d-viewer="getLive2dViewer"
        :add-mouse-event-to-live2d-canvas="addMouseEventToLive2dCanvas"
        :remove-mouse-event-at-live2d-canvas="removeMouseEventAtLive2dCanvas"
        :live2d-canvas="live2dCanvas"
        :live2d-scene-renderer="live2dSceneRenderer"
      />
    </KeepAlive>
    <AllDialog :is-engines-ready="isEnginesReady" />
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { Live2dViewer, Live2dModel } from "live2dmanager";
import { watch, onMounted, ref, computed, toRaw } from "vue";
import { useGtm } from "@gtm-support/vue-gtm";
import TalkEditor from "@/components/Talk/TalkEditor.vue";
import SingEditor from "@/components/Sing/SingEditor.vue";
import { EngineId } from "@/type/preload";
import ErrorBoundary from "@/components/ErrorBoundary.vue";
import { useStore } from "@/store";
import { useHotkeyManager } from "@/plugins/hotkeyPlugin";
import AllDialog from "@/components/Dialog/AllDialog.vue";
import { Live2dSceneRenderer } from "@/live2d/scenes/renderer";

const store = useStore();

const openedEditor = computed(() => store.state.openedEditor);

/**
 * 読み込むプロジェクトファイルのパス。
 * undefinedのときは何も読み込むべきものがない。
 */
const projectFilePath = ref<string | undefined>(undefined);

// Google Tag Manager
const gtm = useGtm();
watch(
  () => store.state.acceptRetrieveTelemetry,
  (acceptRetrieveTelemetry) => {
    gtm?.enable(acceptRetrieveTelemetry === "Accepted");
  },
  { immediate: true }
);

// フォントの制御用パラメータを変更する
watch(
  () => store.state.editorFont,
  (editorFont) => {
    document.body.setAttribute("data-editor-font", editorFont);
  },
  { immediate: true }
);

// エディタの切り替えを監視してショートカットキーの設定を変更する
watch(
  () => store.state.openedEditor,
  async (openedEditor) => {
    if (openedEditor != undefined) {
      hotkeyManager.onEditorChange(openedEditor);
    }
  }
);

// Live2D
const readFileFunction = async (filePath: string) => {
  const result = await window.backend.readFile({ filePath });
  if (result.ok) {
    return result.value;
  }
  return new ArrayBuffer(0);

  // for browser mode
  /*
  try {
    const res = await fetch(filePath);
    return await res.arrayBuffer();
  } catch (e) {
    window.backend.logError(e);
    return new ArrayBuffer(0);
  }
  */
};

const isLoadedLive2dCore = computed(() => store.getters.LIVE2D_CORE_LOADED);
const isLive2dInitialized = computed(() => store.getters.LIVE2D_INITIALIZED);
const isEnableLive2dFeature = computed(
  () => store.state.experimentalSetting.enableLive2dPortrait
);
const live2dCanvas = document.createElement("canvas");
const allocationMemory = 1024 * 1024 * 32;
let live2dViewer: Live2dViewer | undefined = undefined;
try {
  live2dViewer = new Live2dViewer(live2dCanvas, 800, 800);
  live2dViewer.initialize(allocationMemory);
  store.dispatch("LIVE2D_CORE_LOADED", { isLive2dLoaded: true });
} catch (e) {
  window.backend.logError(e);
}
const getLive2dViewer = () => {
  return live2dViewer;
};

const live2dSceneRenderer = new Live2dSceneRenderer();

let isClicked = false;
const mousedown = (e: MouseEvent) => {
  isClicked = true;
  if (live2dViewer == undefined) return;
  live2dViewer.onTouchesBegin(e.pageX, e.pageY);

  const modelKey = live2dViewer.getCurrentModelKey();
  const model = live2dViewer.getModelFromKey(modelKey);
  if (model) {
    model.closeEyelids();
    setTimeout(() => model.openEyelids(), 500);
  }
};
const mouseleave = () => {
  isClicked = false;
  if (live2dViewer == undefined) return;
  live2dViewer.onTouchesEnded();
};
const mouseup = () => {
  isClicked = false;
  if (live2dViewer == undefined) return;
  live2dViewer.onTouchesEnded();
};
const mousemove = (e: MouseEvent) => {
  if (isClicked && live2dViewer) {
    live2dViewer.onTouchesMoved(e.pageX, e.pageY);
  }
};

const addMouseEventToLive2dCanvas = () => {
  live2dCanvas.addEventListener("mousedown", mousedown, { passive: true });
  live2dCanvas.addEventListener("mouseup", mouseup, { passive: true });
  live2dCanvas.addEventListener("mouseleave", mouseleave, { passive: true });
  live2dCanvas.addEventListener("mousemove", mousemove, { passive: true });
};

const removeMouseEventAtLive2dCanvas = () => {
  live2dCanvas.removeEventListener("mousedown", mousedown);
  live2dCanvas.removeEventListener("mouseup", mouseup);
  live2dCanvas.removeEventListener("mouseleave", mouseleave);
  live2dCanvas.removeEventListener("mousemove", mousemove);
};

const releaseLive2d = () => {
  if (live2dViewer != undefined) {
    live2dSceneRenderer.cancelRender();
    live2dViewer.release();
    store.dispatch("LIVE2D_INITIALIZED", { isLive2dInitialized: false });
  }
};
window.addEventListener("unload", releaseLive2d, { passive: true });

const initializeLive2d = async () => {
  if (!isLoadedLive2dCore.value) return;
  if (!isEnableLive2dFeature.value) {
    return;
  }

  if (!isLive2dInitialized.value && live2dViewer) {
    const live2dAssetsPath = await window.backend.getLive2dAssetsPath();
    const lived2dAssetsLoadErrors = [];
    try {
      const zundamon = new Live2dModel(
        live2dAssetsPath + "/Zundamon_vts/",
        "zundamon.model3.json",
        live2dViewer,
        false,
        readFileFunction
      );
      await zundamon.loadAssets();
      zundamon.setLipSyncWeight(20);
      live2dViewer.addModel("388f246b-8c41-4ac1-8e2d-5d79f3ff56d9", zundamon);
      store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
        name: "ずんだもん",
        key: "388f246b-8c41-4ac1-8e2d-5d79f3ff56d9",
      });
    } catch (e) {
      window.backend.logError(e);
      lived2dAssetsLoadErrors.push({});
    }

    try {
      const kasukabeTsumugi = new Live2dModel(
        live2dAssetsPath + "/春日部つむぎ公式live2Dモデル/",
        "春日部つむぎ公式live2Dモデル.model3.json",
        live2dViewer,
        true,
        readFileFunction
      );
      await kasukabeTsumugi.loadAssets();
      kasukabeTsumugi.setLipSyncWeight(15);
      live2dViewer.addModel(
        "35b2c544-660e-401e-b503-0e14c635303a",
        kasukabeTsumugi
      );
      store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
        name: "春日部つむぎ",
        key: "35b2c544-660e-401e-b503-0e14c635303a",
      });
    } catch (e) {
      window.backend.logError(e);
      lived2dAssetsLoadErrors.push({});
    }

    try {
      const kyuusyuuSora = new Live2dModel(
        live2dAssetsPath + "/Sora_vts/",
        "kyuusyuu_sora.model3.json",
        live2dViewer,
        false,
        readFileFunction
      );
      await kyuusyuuSora.loadAssets();
      kyuusyuuSora.setLipSyncWeight(20);
      live2dViewer.addModel(
        "481fb609-6446-4870-9f46-90c4dd623403",
        kyuusyuuSora
      );
      store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
        name: "九州そら",
        key: "481fb609-6446-4870-9f46-90c4dd623403",
      });
    } catch (e) {
      window.backend.logError(e);
      lived2dAssetsLoadErrors.push({});
    }

    try {
      const chugokuUsagi = new Live2dModel(
        live2dAssetsPath + "/Usagi_vts/",
        "usagi.model3.json",
        live2dViewer,
        false,
        readFileFunction
      );
      await chugokuUsagi.loadAssets();
      chugokuUsagi.setLipSyncWeight(20);
      live2dViewer.addModel(
        "1f18ffc3-47ea-4ce0-9829-0576d03a7ec8",
        chugokuUsagi
      );
      store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
        name: "中国うさぎ",
        key: "1f18ffc3-47ea-4ce0-9829-0576d03a7ec8",
      });
    } catch (e) {
      window.backend.logError(e);
      lived2dAssetsLoadErrors.push({});
    }

    if (lived2dAssetsLoadErrors.length === 4) {
      live2dViewer.release();
      return;
    } else {
      live2dViewer.setCurrentModel("388f246b-8c41-4ac1-8e2d-5d79f3ff56d9");
      store.dispatch("LIVE2D_INITIALIZED", { isLive2dInitialized: true });
    }
  }
};

watch(isEnableLive2dFeature, async (newVal) => {
  if (!newVal || isLive2dInitialized) return;

  await initializeLive2d();
});

// ソフトウェアを初期化
const { hotkeyManager } = useHotkeyManager();
const isEnginesReady = ref(false);
const isProjectFileLoaded = ref<boolean | "waiting">("waiting");
onMounted(async () => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  await store.dispatch("INIT_VUEX");

  // プロジェクトファイルのパスを取得
  const _projectFilePath = urlParams.get("projectFilePath");
  if (_projectFilePath != undefined && _projectFilePath !== "") {
    projectFilePath.value = _projectFilePath;
  }

  // どちらのエディタを開くか設定
  await store.dispatch("SET_OPENED_EDITOR", { editor: "talk" });

  // ショートカットキーの設定を登録
  const hotkeySettings = store.state.hotkeySettings;
  hotkeyManager.load(structuredClone(toRaw(hotkeySettings)));

  // エンジンの初期化開始

  // エンジン情報取得
  await store.dispatch("GET_ENGINE_INFOS");

  // URLパラメータに従ってマルチエンジンをオフにする
  const isMultiEngineOffMode = urlParams.get("isMultiEngineOffMode") === "true";
  store.dispatch("SET_IS_MULTI_ENGINE_OFF_MODE", isMultiEngineOffMode);

  // マルチエンジンオフモードのときはデフォルトエンジンだけにする
  let engineIds: EngineId[];
  if (isMultiEngineOffMode) {
    const main = Object.values(store.state.engineInfos).find(
      (engine) => engine.type === "default"
    );
    if (!main) {
      throw new Error("No main engine found");
    }
    engineIds = [main.uuid];
  } else {
    engineIds = store.state.engineIds;
  }
  await store.dispatch("LOAD_USER_CHARACTER_ORDER");
  await store.dispatch("POST_ENGINE_START", {
    engineIds,
  });

  // 辞書を同期
  await store.dispatch("SYNC_ALL_USER_DICT");

  isEnginesReady.value = true;

  // エンジン起動後にダイアログを開く
  store.dispatch("SET_DIALOG_OPEN", {
    isAcceptRetrieveTelemetryDialogOpen:
      store.state.acceptRetrieveTelemetry === "Unconfirmed",
    isAcceptTermsDialogOpen:
      import.meta.env.MODE !== "development" &&
      store.state.acceptTerms !== "Accepted",
  });

  // プロジェクトファイルが指定されていればロード
  if (
    typeof projectFilePath.value === "string" &&
    projectFilePath.value !== ""
  ) {
    isProjectFileLoaded.value = await store.dispatch("LOAD_PROJECT_FILE", {
      filePath: projectFilePath.value,
    });
  } else {
    isProjectFileLoaded.value = false;
  }

  if (isEnableLive2dFeature.value) {
    await initializeLive2d();
  }
});
</script>
