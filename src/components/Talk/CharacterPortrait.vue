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
      <QSpinner color="primary" size="5rem" :thickness="4" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Live2dViewer } from "live2dmanager";
import { computed, watch, ref, onUpdated } from "vue";
import { useStore } from "@/store";
import { AudioKey, EditorType } from "@/type/preload";
import { formatCharacterStyleName } from "@/store/utility";
import { drawLive2dPortrait } from "@/live2d/scenes/portrait";

const store = useStore();

const props =
  defineProps<{
    getLive2dViewer: () => Live2dViewer | undefined;
    getAddedLive2dModelValue: (name: string) => string | undefined;
    getNameOfAvailableLive2dModel: (name: string) => string | undefined;
    addMouseEventToLive2dCanvas: () => void;
    removeMouseEventAtLive2dCanvas: () => void;
    isLive2dInitialized: boolean;
    isLoadedLive2dCore: boolean;
    live2dCanvas: HTMLCanvasElement;
  }>();

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

const isEnableLive2dFeature = computed(
  () => store.state.experimentalSetting.enableLive2dPortrait
);
const isLive2dPortrait = ref(false);
const isShowLive2d = computed(() => store.getters.CURRENT_SHOW_IN_TALK);
const live2dViewer = computed(() => props.getLive2dViewer());

const getLive2dModelKey = (): string | undefined => {
  const targetName = props.getNameOfAvailableLive2dModel(characterName.value);
  if (targetName == undefined) {
    store.dispatch("CURRENT_SHOW_IN_TALK", { isShow: false });
    return;
  }

  const v = props.getAddedLive2dModelValue(targetName);
  return v;
};

const changeLive2dModelIndex = (isMoveToTalk?: boolean) => {
  if (live2dViewer.value == undefined || !props.isLive2dInitialized) return;
  if (isMoveToTalk) {
    console.log(
      `change live2d model index when is move to talk: ${store.getters.LATEST_USE_CHARACTER_KEY_IN_TALK}`
    );
    live2dViewer.value.setCurrentModel(
      store.getters.LATEST_USE_CHARACTER_KEY_IN_TALK
    );
    return;
  }

  const targetName = props.getNameOfAvailableLive2dModel(characterName.value);
  if (targetName == undefined) {
    store.dispatch("CURRENT_SHOW_IN_TALK", { isShow: false });
    return;
  }

  const v = props.getAddedLive2dModelValue(targetName);
  if (v != undefined) {
    if (v === store.getters.LATEST_USE_CHARACTER_KEY_IN_TALK) return;
    live2dViewer.value.setCurrentModel(v);
    store.dispatch("LATEST_USE_CHARACTER_KEY_IN_TALK", { key: v });
    store.dispatch("CURRENT_SHOW_IN_TALK", { isShow: true });
  } else {
    store.dispatch("CURRENT_SHOW_IN_TALK", { isShow: false });
  }
  console.log("changeLive2dModelIndex in talk");
};

const showLive2d = (isDoEditorSwitch?: boolean) => {
  console.log("show");
  if (!live2dViewer.value || !props.isLive2dInitialized) return;

  const place = document.getElementsByClassName("live2d");
  if (place == undefined || place.length < 1) {
    return;
  }
  console.log(
    `place length: ${place.length}, place[0].childElementCount: ${place[0].childElementCount}`
  );
  if (place.length === 1 && place[0].childElementCount === 0) {
    place[0].appendChild(props.live2dCanvas);
  }

  changeLive2dModelIndex(isDoEditorSwitch);
  if (!store.getters.CURRENT_SHOW_IN_TALK) return;
  props.addMouseEventToLive2dCanvas();

  console.log("draw");
  drawLive2dPortrait(live2dViewer.value);
};

const disAppearLive2d = () => {
  store.dispatch("CURRENT_SHOW_IN_TALK", { isShow: false });
  isLive2dPortrait.value = false;

  props.removeMouseEventAtLive2dCanvas();
};

watch(characterName, (newVal: string) => {
  if (!props.isLoadedLive2dCore) return;

  if (!isEnableLive2dFeature.value) {
    if (isShowLive2d.value) {
      disAppearLive2d();
    }
    return;
  }

  const name = props.getNameOfAvailableLive2dModel(newVal);
  if (name == undefined) {
    disAppearLive2d();
    return;
  }

  const v = props.getAddedLive2dModelValue(name);
  console.log(v);
  if (v == undefined) {
    disAppearLive2d();
    return;
  }

  isLive2dPortrait.value = true;
});

watch(isEnableLive2dFeature, (newVal) => {
  if (!newVal) {
    isLive2dPortrait.value = false;
  }
});

const editorMode = computed(() => store.state.openedEditor);
watch(editorMode, (newVal) => {
  console.log(`editorMode: ${newVal}`);
  console.log(`isShowLiv2d: ${isShowLive2d.value}`);
  console.log("in talk");
  if (newVal === ("song" as EditorType)) return;

  if (store.getters.CURRENT_SHOW_IN_TALK) {
    showLive2d(true);
  }
});

onUpdated(() => {
  if (!props.isLoadedLive2dCore) return;
  if (!isEnableLive2dFeature.value && isShowLive2d.value) {
    disAppearLive2d();
    return;
  }

  const v = getLive2dModelKey();
  if (v != undefined) {
    if (
      v != store.getters.LATEST_USE_CHARACTER_KEY_IN_TALK &&
      !isLive2dPortrait.value
    ) {
      isLive2dPortrait.value = true;
    }
  } else {
    disAppearLive2d();
    return;
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
