<template>
  <div class="character-portrait-wrapper">
    <span class="character-name">{{ characterName }}</span>
    <span v-if="isMultipleEngine" class="character-engine-name">{{
      engineName
    }}</span>
    <img
      v-if="!isEnableLive2dFeature || !isLoadLive2dCore || !isLive2dPortrait"
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

const store = useStore();

const characterInfo = computed(() => {
  const activeAudioKey: AudioKey | undefined = store.getters.ACTIVE_AUDIO_KEY;
  const audioItem = activeAudioKey
    ? store.state.audioItems[activeAudioKey]
    : undefined;

  const engineId = audioItem?.voice.engineId;
  const styleId = audioItem?.voice.styleId;

  if (
    engineId === undefined ||
    styleId === undefined ||
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
};

const isEnableLive2dFeature = computed(
  () => store.state.experimentalSetting.enableLive2dPortrait
);
const isLive2dPortrait = ref(false);
let isLive2dInitialize = false;
const isLoadLive2dCore = ref(false);
const isShowLive2d = computed(() => store.state.isShowLive2dViewer);
const live2dCanvas = document.createElement("canvas");

let live2dViewer: Live2dViewer | undefined = undefined;
try {
  live2dViewer = new Live2dViewer(live2dCanvas);
  live2dViewer.initialize();
  isLoadLive2dCore.value = true;
} catch (e) {
  console.log(e);
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
  if (!live2dViewer) return;
  live2dViewer.onTouchesBegin(e.pageX, e.pageY);
};
const mouseleave = () => {
  isClicked = false;
  if (!live2dViewer) return;
  live2dViewer.onTouchesEnded();
};
const mouseup = () => {
  isClicked = false;
  if (!live2dViewer) return;
  live2dViewer.onTouchesEnded();
};
const mousemove = (e: MouseEvent) => {
  if (isClicked && live2dViewer) {
    live2dViewer.onTouchesMoved(e.pageX, e.pageY);
  }
};
const showLive2d = () => {
  if (!live2dViewer || isShowLive2d.value) return;
  const place = document.getElementsByClassName("live2d");
  console.log(`is exists live2d container element: ${place.length}`);
  if (place.length <= 0) return;
  place[0].appendChild(live2dCanvas);
  store.dispatch("SET_IS_SHOW_LIVE2D_VIEWER", { isShowLive2dViewer: true });

  live2dCanvas.addEventListener("mousedown", mousedown);
  live2dCanvas.addEventListener("mouseup", mouseup);
  live2dCanvas.addEventListener("mouseleave", mouseleave);
  live2dCanvas.addEventListener("mousemove", mousemove);

  live2dViewer.run();
};

const disAppearLive2d = () => {
  store.dispatch("SET_IS_SHOW_LIVE2D_VIEWER", { isShowLive2dViewer: false });
  isLive2dPortrait.value = false;
  live2dCanvas.removeEventListener("mousedown", mousedown);
  live2dCanvas.removeEventListener("mouseup", mouseup);
  live2dCanvas.removeEventListener("mouseleave", mouseleave);
  live2dCanvas.removeEventListener("mousedown", mousedown);
};

watch(characterName, (newVal: string) => {
  if (!isEnableLive2dFeature.value) {
    if (isShowLive2d.value) {
      disAppearLive2d();
    }

    return;
  }

  if (!newVal.includes("春日部つむぎ") && live2dViewer) {
    disAppearLive2d();
    return;
  }
  isLive2dPortrait.value = true;
});

onUpdated(async () => {
  if (
    !isEnableLive2dFeature.value ||
    !isLoadLive2dCore.value ||
    !isLive2dPortrait.value
  )
    return;

  if (!isShowLive2d.value && !isLive2dInitialize && live2dViewer) {
    const live2dAssetsPath = await window.electron.getLive2dAssetsPath();
    console.log(live2dAssetsPath);
    const live2dModel = new Live2dModel(
      live2dAssetsPath + "/春日部つむぎ公式live2Dモデル/",
      "春日部つむぎ公式live2Dモデル.model3.json",
      live2dViewer,
      true,
      readFileFunction
    );
    live2dModel.loadAssets();
    live2dViewer.addModel(live2dModel);
    live2dViewer.setCurrentModel(0);
    isLive2dInitialize = true;
  }
  showLive2d();
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
