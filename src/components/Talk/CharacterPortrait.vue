<template>
  <div class="character-portrait-wrapper">
    <span class="character-name">{{ characterName }}</span>
    <span v-if="isMultipleEngine" class="character-engine-name">{{
      engineName
    }}</span>
    <img
      v-if="!isEnableLive2dFeature || !isLoadedLive2dCore || !isLive2dPortrait"
      :src="portraitPath"
      class="character-portrait"
      :alt="characterName"
    />
    <div v-else class="live2d character-portrait"></div>
    <div v-if="isInitializingSpeaker" class="loading">
      <q-spinner color="primary" size="5rem" :thickness="4" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Live2dViewer, Live2dModel } from "live2dmanager";
import { computed, watch, ref, onUpdated } from "vue";
import { useStore } from "@/store";
import { AudioKey } from "@/type/preload";
import { formatCharacterStyleName } from "@/store/utility";
import { drawLive2dPortrait } from "@/live2d/scenes/portrait";

const store = useStore();

const characterInfo = computed(() => {
  const activeAudioKey: AudioKey | undefined = store.getters.ACTIVE_AUDIO_KEY;
  const audioItem = activeAudioKey
    ? store.state.audioItems[activeAudioKey]
    : undefined;

  const engineId = audioItem?.voice.engineId;
  const styleId = audioItem?.voice.styleId;

  if (
    engineId == undefined ||
    styleId == undefined ||
    !store.state.engineIds.some((id) => id === engineId)
  )
    return undefined;

  return store.getters.CHARACTER_INFO(engineId, styleId);
});

const styleInfo = computed(() => {
  const activeAudioKey = store.getters.ACTIVE_AUDIO_KEY;

  const audioItem = activeAudioKey
    ? store.state.audioItems[activeAudioKey]
    : undefined;

  const styleId = audioItem?.voice.styleId;
  const style = characterInfo.value?.metas.styles.find(
    (style) => style.styleId === styleId
  );
  return style;
});

const characterName = computed(() => {
  // 初期化前・未選択時
  if (characterInfo.value == undefined) {
    return "（表示エラー）";
  }

  const speakerName = characterInfo.value.metas.speakerName;
  const styleName = styleInfo.value?.styleName;
  return styleName
    ? formatCharacterStyleName(speakerName, styleName)
    : speakerName;
});

const engineName = computed(() => {
  const activeAudioKey = store.getters.ACTIVE_AUDIO_KEY;
  const audioItem = activeAudioKey
    ? store.state.audioItems[activeAudioKey]
    : undefined;
  const engineId = audioItem?.voice.engineId ?? store.state.engineIds[0];
  const engineManifest = store.state.engineManifests[engineId];
  const engineInfo = store.state.engineInfos[engineId];
  return engineManifest ? engineManifest.brandName : engineInfo.name;
});

const portraitPath = computed(
  () => styleInfo.value?.portraitPath || characterInfo.value?.portraitPath
);

const isInitializingSpeaker = computed(() => {
  const activeAudioKey = store.getters.ACTIVE_AUDIO_KEY;
  return (
    activeAudioKey &&
    store.state.audioKeysWithInitializingSpeaker.includes(activeAudioKey)
  );
});

const isMultipleEngine = computed(() => store.state.engineIds.length > 1);

const readFileFunction = async (filePath: string) => {
  const result = await window.electron.readFile({ filePath });
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
    window.electron.logError(e);
    return new ArrayBuffer(0);
  }
  */
};

const isEnableLive2dFeature = computed(
  () => store.state.experimentalSetting.enableLive2dPortrait
);
const isLive2dPortrait = ref(false);
const isLive2dInitialized = ref(false);
const isLoadedLive2dCore = ref(false);
const isShowLive2d = computed(() => store.state.isShowLive2dViewer);
const live2dCanvas = document.createElement("canvas");
const availableLive2dModels = [
  "ずんだもん",
  "春日部つむぎ",
  "九州そら",
  "中国うさぎ",
];
const addedModels: Record<string, string> = {};

const allocationMemory = 1024 * 1024 * 32;
let live2dViewer: Live2dViewer | undefined = undefined;
try {
  live2dViewer = new Live2dViewer(live2dCanvas, 800, 800);
  live2dViewer.initialize(allocationMemory);
  isLoadedLive2dCore.value = true;
} catch (e) {
  window.electron.logError(e);
}

const getLive2dViewer = () => {
  return live2dViewer;
};
defineExpose({
  getLive2dViewer,
});

let isClicked = false;
const mousedown = (e: MouseEvent) => {
  isClicked = true;
  if (live2dViewer == undefined) return;
  live2dViewer.onTouchesBegin(e.pageX, e.pageY);
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

const getNameOfAvailableLive2dModel = (name: string): string | undefined => {
  return availableLive2dModels.find((v) => name.includes(v));
};

const changeLive2dModelIndex = () => {
  if (live2dViewer == undefined || !isLive2dInitialized.value) return;

  const targetName = getNameOfAvailableLive2dModel(characterName.value);
  if (targetName == undefined) return;

  const v = addedModels[targetName];
  console.log(`name: ${targetName}, val: ${v}`);
  if (v != undefined) {
    live2dViewer.setCurrentModel(v);
  }
};

const showLive2d = () => {
  if (!live2dViewer || !isLive2dInitialized.value) return;

  changeLive2dModelIndex();
  if (isShowLive2d.value || !isLive2dPortrait.value) {
    return;
  }

  const place = document.getElementsByClassName("live2d");
  if (place.length < 1) return;
  place[0].appendChild(live2dCanvas);
  store.dispatch("SET_IS_SHOW_LIVE2D_VIEWER", { isShowLive2dViewer: true });

  live2dCanvas.addEventListener("mousedown", mousedown, { passive: true });
  live2dCanvas.addEventListener("mouseup", mouseup, { passive: true });
  live2dCanvas.addEventListener("mouseleave", mouseleave, { passive: true });
  live2dCanvas.addEventListener("mousemove", mousemove, { passive: true });

  drawLive2dPortrait(live2dViewer);
};

const disAppearLive2d = () => {
  store.dispatch("SET_IS_SHOW_LIVE2D_VIEWER", { isShowLive2dViewer: false });
  isLive2dPortrait.value = false;
  live2dCanvas.removeEventListener("mousedown", mousedown);
  live2dCanvas.removeEventListener("mouseup", mouseup);
  live2dCanvas.removeEventListener("mouseleave", mouseleave);
  live2dCanvas.removeEventListener("mousedown", mousedown);
};

const releaseLive2d = () => {
  if (live2dViewer != undefined) {
    live2dViewer.release();
    isLive2dInitialized.value = false;
    isLive2dPortrait.value = false;
  }
};
window.addEventListener("unload", releaseLive2d, { passive: true });

watch(characterName, (newVal: string) => {
  if (!isLoadedLive2dCore.value) return;

  if (!isEnableLive2dFeature.value) {
    if (isShowLive2d.value) {
      disAppearLive2d();
    }
    return;
  }

  const name = getNameOfAvailableLive2dModel(newVal);
  if (name == undefined) {
    disAppearLive2d();
    return;
  }

  const v = addedModels[name];
  if (v == undefined) {
    disAppearLive2d();
    return;
  }

  isLive2dPortrait.value = true;
});

onUpdated(async () => {
  if (!isLoadedLive2dCore.value) return;
  if (!isEnableLive2dFeature.value && isShowLive2d.value) {
    disAppearLive2d();
    return;
  }

  if (!isLive2dInitialized.value && live2dViewer) {
    const live2dAssetsPath = await window.electron.getLive2dAssetsPath();
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
      addedModels["ずんだもん"] = "388f246b-8c41-4ac1-8e2d-5d79f3ff56d9";
    } catch (e) {
      window.electron.logError(e);
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
      kasukabeTsumugi.setLipSyncWeight(20);
      live2dViewer.addModel(
        "35b2c544-660e-401e-b503-0e14c635303a",
        kasukabeTsumugi
      );
      addedModels["春日部つむぎ"] = "35b2c544-660e-401e-b503-0e14c635303a";
    } catch (e) {
      window.electron.logError(e);
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
      addedModels["九州そら"] = "481fb609-6446-4870-9f46-90c4dd623403";
    } catch (e) {
      window.electron.logError(e);
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
      addedModels["中国うさぎ"] = "1f18ffc3-47ea-4ce0-9829-0576d03a7ec8";
    } catch (e) {
      window.electron.logError(e);
      lived2dAssetsLoadErrors.push({});
    }

    if (lived2dAssetsLoadErrors.length === 4) {
      live2dViewer.release();
      return;
    } else {
      live2dViewer.setCurrentModel("388f246b-8c41-4ac1-8e2d-5d79f3ff56d9");
      isLive2dInitialized.value = true;
    }
  }

  const name = getNameOfAvailableLive2dModel(characterName.value);
  if (name != undefined) {
    const v = addedModels[name];
    if (v != undefined) {
      isLive2dPortrait.value = true;
    }
  }

  if (isLive2dPortrait.value) {
    showLive2d();
  }
});
</script>

<style scoped lang="scss">
@use '@/styles/colors' as colors;

.character-name {
  position: absolute;
  padding: 1px 24px 1px 8px;
  background-image: linear-gradient(
    90deg,
    rgba(colors.$background-rgb, 0.5) 0%,
    rgba(colors.$background-rgb, 0.5) 75%,
    transparent 100%
  );
  overflow-wrap: anywhere;
}

.character-engine-name {
  position: absolute;
  padding: 1px 24px 1px 8px;
  background-image: linear-gradient(
    90deg,
    rgba(colors.$background-rgb, 0.5) 0%,
    rgba(colors.$background-rgb, 0.5) 75%,
    transparent 100%
  );
  bottom: 0;
  overflow-wrap: anywhere;
}

.character-portrait-wrapper {
  display: grid;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  .character-portrait {
    margin: auto;
  }
  .loading {
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: rgba(colors.$background-rgb, 0.3);
    display: grid;
    justify-content: center;
    align-content: center;
  }
}
</style>
