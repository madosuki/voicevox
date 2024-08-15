<template>
  <ErrorBoundary>
    <TooltipProvider disableHoverableContent>
      <MenuBar
        v-if="openedEditor != undefined"
        :fileSubMenuData="subMenuData.fileSubMenuData.value"
        :editSubMenuData="subMenuData.editSubMenuData.value"
        :viewSubMenuData="subMenuData.viewSubMenuData.value"
        :editor="openedEditor"
        :getLive2dViewer
        :addMouseEventToLive2dCanvas
        :removeMouseEventAtLive2dCanvas
        :live2dCanvas
        :live2dSceneRenderer
      />
      <KeepAlive>
        <Component
          :is="openedEditor == 'talk' ? TalkEditor : SingEditor"
          v-if="openedEditor != undefined"
          :key="openedEditor"
          :isEnginesReady
          :isProjectFileLoaded
          :getLive2dViewer
          :addMouseEventToLive2dCanvas
          :removeMouseEventAtLive2dCanvas
          :live2dCanvas
          :live2dSceneRenderer
        />
      </KeepAlive>
      <AllDialog :isEnginesReady />
    </TooltipProvider>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { watch, onMounted, ref, computed, toRaw } from "vue";
import { useGtm } from "@gtm-support/vue-gtm";
import { TooltipProvider } from "radix-vue";
import TalkEditor from "@/components/Talk/TalkEditor.vue";
import SingEditor from "@/components/Sing/SingEditor.vue";
import { EngineId } from "@/type/preload";
import ErrorBoundary from "@/components/ErrorBoundary.vue";
import { useStore } from "@/store";
import { useHotkeyManager } from "@/plugins/hotkeyPlugin";
import AllDialog from "@/components/Dialog/AllDialog.vue";
import { Live2dSceneRenderer } from "@/live2d/renderer";
import MenuBar from "@/components/Menu/MenuBar/MenuBar.vue";
import { useMenuBarData as useTalkMenuBarData } from "@/components/Talk/menuBarData";
import { useMenuBarData as useSingMenuBarData } from "@/components/Sing/menuBarData";
import { ExhaustiveError } from "@/type/utility";

const { Live2dViewer, Live2dModel, Live2dMotionSyncModel } = await import(
  "live2dmanager"
)
  .then((m) => {
    return {
      Live2dViewer: m.Live2dViewer,
      Live2dModel: m.Live2dModel,
      Live2dMotionSyncModel: m.Live2dMotionSyncModel,
    };
  })
  .catch((e) => {
    window.backend.logError("error!");
    window.backend.logError(e);
    return {
      Live2dViewer: undefined,
      Live2dModel: undefined,
      Live2dMotionSyncModel: undefined,
    };
  });

const store = useStore();

const talkMenuBarData = useTalkMenuBarData();
const singMenuBarData = useSingMenuBarData();

const subMenuData = computed(() => {
  if (openedEditor.value === "talk" || openedEditor.value == undefined) {
    return talkMenuBarData;
  } else if (openedEditor.value === "song") {
    return singMenuBarData;
  }

  throw new ExhaustiveError(openedEditor.value);
});

const openedEditor = computed(() => store.state.openedEditor);

// Google Tag Manager
const gtm = useGtm();
watch(
  () => store.state.acceptRetrieveTelemetry,
  (acceptRetrieveTelemetry) => {
    gtm?.enable(acceptRetrieveTelemetry === "Accepted");
  },
  { immediate: true },
);

// フォントの制御用パラメータを変更する
watch(
  () => store.state.editorFont,
  (editorFont) => {
    document.body.setAttribute("data-editor-font", editorFont);
  },
  { immediate: true },
);

// エディタの切り替えを監視してショートカットキーの設定を変更する
watch(
  () => store.state.openedEditor,
  async (openedEditor) => {
    if (openedEditor != undefined) {
      hotkeyManager.onEditorChange(openedEditor);
    }
  },
);

// Live2D
const readFileFunction = async (filePath: string) => {
  if (import.meta.env.VITE_TARGET === "electron") {
    const result = await window.backend.readFile({ filePath });
    if (result.ok) {
      return result.value;
    }
    return new ArrayBuffer(0);
  } else {
    // for browser mode
    try {
      const res = await fetch(filePath);
      return await res.arrayBuffer();
    } catch (e) {
      window.backend.logError(e);
      return new ArrayBuffer(0);
    }
  }
};

const isLoadedLive2dCore = computed(() => store.getters.LIVE2D_CORE_LOADED);
const isLive2dInitialized = computed(() => store.getters.LIVE2D_INITIALIZED);
const isEnableLive2dFeature = computed(
  () => store.state.experimentalSetting.enableLive2dPortrait,
);
const live2dCanvas = document.createElement("canvas");
const allocationMemory = 1024 * 1024 * 32;
let live2dViewer = undefined;
if (Live2dViewer != undefined) {
  try {
    console.log("new live2dViewer");
    live2dViewer = new Live2dViewer(live2dCanvas, 800, 800);
    console.log("end");
    live2dViewer.initialize(allocationMemory);
    await store.dispatch("LIVE2D_CORE_LOADED", { isLive2dLoaded: true });
  } catch (e) {
    window.backend.logError(e);
  }
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

const releaseLive2d = async () => {
  if (live2dViewer != undefined) {
    live2dSceneRenderer.cancelRender();
    live2dViewer.release();
    await store.dispatch("LIVE2D_INITIALIZED", { isLive2dInitialized: false });
  }
};
window.addEventListener("unload", releaseLive2d, { passive: true });

const initializeLive2d = async () => {
  console.log(`isLoadedLive2dCore: ${isLoadedLive2dCore.value}`);
  if (!isLoadedLive2dCore.value) return;
  if (!isEnableLive2dFeature.value) {
    return;
  }

  if (
    !isLive2dInitialized.value &&
    live2dViewer != undefined &&
    Live2dModel != undefined &&
    Live2dMotionSyncModel != undefined
  ) {
    const live2dAssetsPath = await window.backend.getLive2dAssetsPath();
    const metan = new Live2dModel(
      live2dAssetsPath + "/四国めたん_vts/",
      "四国めたん.model3.json",
      live2dViewer,
      readFileFunction,
    );
    metan
      .loadAssets()
      .then(async () => {
        if (live2dViewer == undefined) return;
        metan.setLipSyncWeight(10);
        live2dViewer.addModel("7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff", metan);
        await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
          name: "四国めたん",
          key: "7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff",
        });
      })
      .catch((e) => {
        window.backend.logError(
          `Error when load metan live2d model assets: ${e}`,
        );
      });
    const zundamon = new Live2dModel(
      live2dAssetsPath + "/Zundamon_vts/",
      "zundamon.model3.json",
      live2dViewer,
      readFileFunction,
    );
    zundamon
      .loadAssets()
      .then(async () => {
        if (live2dViewer == undefined) return;
        zundamon.setLipSyncWeight(20);
        live2dViewer.addModel("388f246b-8c41-4ac1-8e2d-5d79f3ff56d9", zundamon);
        await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
          name: "ずんだもん",
          key: "388f246b-8c41-4ac1-8e2d-5d79f3ff56d9",
        });
      })
      .catch((e) => {
        window.backend.logError(
          `Error when load zundamon live2d model assets: ${e}`,
        );
        zundamon.release();
      });

    const kasukabeTsumugi = new Live2dModel(
      live2dAssetsPath + "/春日部つむぎ公式live2Dモデル/",
      "春日部つむぎ公式live2Dモデル.model3.json",
      live2dViewer,
      readFileFunction,
      true,
    );
    kasukabeTsumugi
      .loadAssets()
      .then(async () => {
        if (live2dViewer == undefined) return;
        kasukabeTsumugi.setLipSyncWeight(15);
        live2dViewer.addModel(
          "35b2c544-660e-401e-b503-0e14c635303a",
          kasukabeTsumugi,
        );
        await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
          name: "春日部つむぎ",
          key: "35b2c544-660e-401e-b503-0e14c635303a",
        });
      })
      .catch((e) => {
        window.backend.logError(
          `Error when load kasukabe tsumugi live2d model assets: ${e}`,
        );
        kasukabeTsumugi.release();
      });

    const kyuusyuuSora = new Live2dModel(
      live2dAssetsPath + "/Sora_vts/",
      "kyuusyuu_sora.model3.json",
      live2dViewer,
      readFileFunction,
    );
    kyuusyuuSora
      .loadAssets()
      .then(async () => {
        if (live2dViewer == undefined) return;
        kyuusyuuSora.setLipSyncWeight(20);
        live2dViewer.addModel(
          "481fb609-6446-4870-9f46-90c4dd623403",
          kyuusyuuSora,
        );
        await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
          name: "九州そら",
          key: "481fb609-6446-4870-9f46-90c4dd623403",
        });
      })
      .catch((e) => {
        window.backend.logError(
          `Error when load kyuusyuu sora live2d model assets: ${e}`,
        );
        kyuusyuuSora.release();
      });

    const chugokuUsagi = new Live2dModel(
      live2dAssetsPath + "/Usagi_vts/",
      "usagi.model3.json",
      live2dViewer,
      readFileFunction,
    );
    chugokuUsagi
      .loadAssets()
      .then(async () => {
        if (live2dViewer == undefined) return;
        chugokuUsagi.setLipSyncWeight(20);
        chugokuUsagi.setExpression("Inaba");
        live2dViewer.addModel(
          "1f18ffc3-47ea-4ce0-9829-0576d03a7ec8",
          chugokuUsagi,
        );
        await store.dispatch("ADDED_LIVE2D_MODEL_RECORD", {
          name: "中国うさぎ",
          key: "1f18ffc3-47ea-4ce0-9829-0576d03a7ec8",
        });
      })
      .catch((e) => {
        window.backend.logError(
          `Error when load chudoku usagi live2d model assets: ${e}`,
        );
        chugokuUsagi.release();
      });

    // Motion Sync サンプル
    const kei = new Live2dMotionSyncModel(
      live2dAssetsPath + "/Kei_basic/",
      "Kei_basic.model3.json",
      live2dViewer,
      readFileFunction,
    );
    kei
      .loadAssets()
      .then(async () => {
        if (live2dViewer == undefined) return;
        live2dViewer.addModel("b1a81618-b27b-40d2-b0ea-27a9ad408c4b", kei);
        await store.actions.ADDED_LIVE2D_MODEL_RECORD({
          name: "波音リツ",
          key: "b1a81618-b27b-40d2-b0ea-27a9ad408c4b",
        });
      })
      .catch((e) => {
        window.backend.logError(e);
        kei.release();
      });

    live2dViewer.setCurrentModel("7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff");
    await store.dispatch("LIVE2D_INITIALIZED", { isLive2dInitialized: true });
  }
};

watch(isEnableLive2dFeature, async (newVal) => {
  console.log(
    `isEnableLive2dFeature: ${newVal}, isLive2dInitialize: ${isLive2dInitialized.value}`,
  );
  if (!newVal || isLive2dInitialized.value) return;

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
  const projectFilePath = urlParams.get("projectFilePath");

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
  void store.dispatch("SET_IS_MULTI_ENGINE_OFF_MODE", isMultiEngineOffMode);

  // マルチエンジンオフモードのときはデフォルトエンジンだけにする
  let engineIds: EngineId[];
  if (isMultiEngineOffMode) {
    const main = Object.values(store.state.engineInfos).find(
      (engine) => engine.type === "default",
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
  void store.dispatch("SET_DIALOG_OPEN", {
    isAcceptRetrieveTelemetryDialogOpen:
      store.state.acceptRetrieveTelemetry === "Unconfirmed",
    isAcceptTermsDialogOpen:
      import.meta.env.MODE !== "development" &&
      store.state.acceptTerms !== "Accepted",
  });

  // プロジェクトファイルが指定されていればロード
  if (typeof projectFilePath === "string" && projectFilePath !== "") {
    isProjectFileLoaded.value = await store.dispatch("LOAD_PROJECT_FILE", {
      filePath: projectFilePath,
    });
  } else {
    isProjectFileLoaded.value = false;
  }

  if (isEnableLive2dFeature.value) {
    await initializeLive2d();
  }
});
</script>
