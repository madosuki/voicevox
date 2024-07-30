<template>
  <div class="character-portrait-wrapper">
    <span class="character-name">{{ characterName }}</span>
    <span v-if="isMultipleEngine" class="character-engine-name">{{
      engineName
    }}</span>
    <span
      v-if="isEnableLive2dFeature && isLoadedLive2dCore && isLive2dPortrait"
      class="expressions-selector"
    >
      <QSelect
        v-model="expressionName"
        label="表情モーション"
        :options="live2dExpressions"
        style="min-width: 128px"
        @update:modelValue="setExpression(expressionName)"
      >
      </QSelect>
    </span>
    <img
      v-if="!isEnableLive2dFeature || !isLoadedLive2dCore || !isLive2dPortrait"
      :src="portraitPath"
      class="character-portrait"
      :alt="characterName"
    />
    <div v-else class="live2d-portrait character-portrait"></div>
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
import { Live2dSceneRenderer } from "@/live2d/renderer";
import { sceneOfPortrait } from "@/live2d/scenes/portrait";

const store = useStore();

const props = defineProps<{
  getLive2dViewer: () => Live2dViewer | undefined;
  addMouseEventToLive2dCanvas: () => void;
  removeMouseEventAtLive2dCanvas: () => void;
  live2dCanvas: HTMLCanvasElement;
  live2dSceneRenderer: Live2dSceneRenderer;
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
    (style) => style.styleId === styleId,
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
  () => styleInfo.value?.portraitPath || characterInfo.value?.portraitPath,
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
  () => store.state.experimentalSetting.enableLive2dPortrait,
);
const isLive2dPortrait = ref(false);
const isContinueRunLive2d = computed(
  () =>
    store.getters.CURRENT_SHOW_LIVE2D_IN_SONG ||
    store.getters.CURRENT_SHOW_LIVE2D_IN_TALK,
);
const isLive2dInitialized = computed(() => store.getters.LIVE2D_INITIALIZED);
const isLoadedLive2dCore = computed(() => store.getters.LIVE2D_CORE_LOADED);
const isDrawing = computed(() => store.getters.IS_DRAWING);
const live2dViewer = computed(() => props.getLive2dViewer());

const getLive2dModelKey = (): string | undefined => {
  const targetName = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(
    characterName.value,
  );
  if (targetName == undefined) {
    store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    return;
  }

  const v = store.getters.KEY_FROM_ADDED_LIVE2D_MODEL_RECORD(targetName);
  return v;
};

const expressionName = ref("None");

const live2dExpressions = computed(() => {
  const modelKey = getLive2dModelKey();
  if (modelKey != undefined && live2dViewer.value != undefined) {
    const model = live2dViewer.value.getModelFromKey(modelKey);
    if (model != undefined) {
      const idList = model.getExpressionIdList();
      return ["None", ...idList];
    }
  }
  return [];
});

const setExpression = (name: string) => {
  if (live2dViewer.value == undefined) return;
  const model = live2dViewer.value.getModelFromKey(
    live2dViewer.value.getCurrentModelKey(),
  );
  if (model == undefined) return;
  if (name === "None") {
    model.resetExpression();
  } else {
    model.setExpression(name);
  }
};

watch(characterName, () => {
  expressionName.value = "None";
});

const changeLive2dModelIndex = () => {
  if (live2dViewer.value == undefined || !isLive2dInitialized.value) return;

  const targetName = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(
    characterName.value,
  );
  if (targetName == undefined) {
    store.dispatch("CURRENT_SHOW_LIVE2D_IN_TALK", { isShow: false });
    store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    return;
  }

  const v = store.getters.KEY_FROM_ADDED_LIVE2D_MODEL_RECORD(targetName);
  if (v != undefined) {
    live2dViewer.value.setCurrentModel(v);
    store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: true });
  } else {
    store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
  }
  console.log("changeLive2dModelIndex in talk");
};

const showLive2d = () => {
  console.log("show");
  if (!live2dViewer.value || !isLive2dInitialized.value) return;
  if (!isLive2dPortrait.value) return;

  const place = document.getElementsByClassName("live2d-portrait");
  if (place == undefined || place.length < 1) {
    return;
  }
  console.log(
    `place length: ${place.length}, place[0].childElementCount: ${place[0].childElementCount}`,
  );
  if (place.length === 1 && place[0].childElementCount === 0) {
    place[0].appendChild(props.live2dCanvas);
  }

  changeLive2dModelIndex();
  props.addMouseEventToLive2dCanvas();

  if (!isDrawing.value) {
    console.log("draw");
    props.live2dSceneRenderer.render(live2dViewer.value, sceneOfPortrait);
    store.actions.IS_DRAWING({ isDrawing: true });
  }
};

const disAppearLive2d = () => {
  store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
  isLive2dPortrait.value = false;

  props.removeMouseEventAtLive2dCanvas();
};

const isCanUseLive2dPortrait = (targetName: string): boolean => {
  const name = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(targetName);
  if (name == undefined) return false;

  const key = store.getters.KEY_FROM_ADDED_LIVE2D_MODEL_RECORD(name);
  return key != undefined;
};

watch(characterName, (newVal: string) => {
  if (!isLoadedLive2dCore.value) return;

  if (!isEnableLive2dFeature.value && isLive2dPortrait.value) {
    disAppearLive2d();
    return;
  }

  if (!isCanUseLive2dPortrait(newVal)) {
    disAppearLive2d();
    return;
  }

  isLive2dPortrait.value = true;
});

watch(isEnableLive2dFeature, (newVal) => {
  if (!newVal) {
    store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
    store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    isLive2dPortrait.value = false;
    return;
  }

  if (!isCanUseLive2dPortrait(characterName.value)) return;

  if (!isLive2dPortrait.value) {
    isLive2dPortrait.value = true;
    showLive2d();
  }
});

const editorMode = computed(() => store.state.openedEditor);
watch(editorMode, (newVal) => {
  console.log(`editorMode: ${newVal}`);
  console.log("in talk");
  if (newVal === ("song" as EditorType)) return;
  if (
    !isEnableLive2dFeature.value ||
    !isLoadedLive2dCore.value ||
    !isLive2dInitialized.value
  )
    return;
  if (!isCanUseLive2dPortrait(characterName.value)) return;
  isLive2dPortrait.value = true;
  store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
  store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: true });

  // ソングからトークに遷移する際にはonUpdateが発火しないのでここでLive2Dを表示させる
  showLive2d();
});

onUpdated(() => {
  if (!isLoadedLive2dCore.value) return;
  if (!isEnableLive2dFeature.value && isContinueRunLive2d.value) {
    disAppearLive2d();
    return;
  }

  console.log("onUpdated in talk");
  if (isEnableLive2dFeature.value) {
    if (isCanUseLive2dPortrait(characterName.value)) {
      if (!isLive2dPortrait.value) {
        isLive2dPortrait.value = true;
      }
    }

    if (isLive2dPortrait.value) {
      showLive2d();
    }
  }
});
</script>

<style scoped lang="scss">
@use "@/styles/colors" as colors;

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

.expressions-selector {
  position: absolute;
  padding: 1px 24px 1px 8px;
  background-image: linear-gradient(
    90deg,
    rgba(colors.$background-rgb, 0.5) 0%,
    rgba(colors.$background-rgb, 0.5) 75%,
    transparent 100%
  );
  overflow-wrap: anywhere;
  right: 10px;
}
</style>
