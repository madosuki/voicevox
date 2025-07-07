<template>
  <div ref="portraitSize" class="character-portrait-wrapper">
    <span class="character-name">{{ characterName }}</span>
    <span v-if="isMultipleEngine" class="character-engine-name">{{
      engineName
    }}</span>
    <span
      v-if="isEnableLive2dFeature && isLoadedLive2dCore && isLive2dPortrait"
      class="expressions-selector"
    >
      <QSelect
        v-model="motionFileName"
        label="モーション"
        :options="live2dMotions"
        style="min-width: 128px"
        @update:modelValue="setMotion(motionFileName)"
      ></QSelect>
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
import {
  computed,
  watch,
  ref,
  Ref,
  nextTick,
  onMounted,
  onUnmounted,
} from "vue";
import { useStore } from "@/store";
import { AudioKey, EditorType, SpeakerId } from "@/type/preload";
import { formatCharacterStyleName } from "@/store/utility";
import { Live2dManagerForV } from "@/live2d/live2d";

const store = useStore();

const props = defineProps<{
  live2dManager: Live2dManagerForV;
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

const expressionName = ref("None");
const live2dExpressions: Ref<string[]> = ref([]);
const motionFileName = ref("None");
const live2dMotions: Ref<string[]> = ref([]);

const setExpression = async (name: string) => {
  const audioKey = store.getters.ACTIVE_AUDIO_KEY;
  if (audioKey == undefined) return;

  const live2dTypes = await props.live2dManager.getTypes();
  if (live2dTypes == undefined) return;
  const Live2dViewer = live2dTypes.Live2dViewer;
  const live2dViewer = props.live2dManager.getLive2dViewer();
  if (live2dViewer instanceof Live2dViewer) {
    const model = live2dViewer.getModelFromKey(
      live2dViewer.getCurrentModelKey(),
    );
    if (model == undefined) return;
    model.releaseMotions();
    model.releaseExpressions();
    if (name === "None") {
      model.stopExpression();

      await store.actions.PREVIOUS_EXPRESSION({
        audioKey: audioKey,
        speakerId: live2dViewer.getCurrentModelKey() as SpeakerId,
        expressionName: "None",
      });
    } else {
      model.setExpression(name);

      await store.actions.PREVIOUS_EXPRESSION({
        audioKey: audioKey,
        speakerId: live2dViewer.getCurrentModelKey() as SpeakerId,
        expressionName: name,
      });
    }
  }
};

const setMotion = async (name: string) => {
  const live2dTypes = await props.live2dManager.getTypes();
  if (live2dTypes == undefined) return;
  const Live2dViewer = live2dTypes.Live2dViewer;

  const live2dViewer = props.live2dManager.getLive2dViewer();
  if (live2dViewer instanceof Live2dViewer) {
    const model = live2dViewer.getModelFromKey(
      live2dViewer.getCurrentModelKey(),
    );
    if (model == undefined) return;

    model.releaseMotions();
    if (name === "None") {
      model.setIdleMotion();
    }
    if (name !== "None") {
      const r = model.getMotionGroupAndIndex(name);
      if (r != undefined) {
        const groupName = r[0];
        const indexAtGroup = r[1];
        model
          .startMotion(groupName, indexAtGroup)
          .catch((e) => window.backend.logError(e));
      }
    }
  }
};

const restoreExpression = async (audioKey: AudioKey) => {
  const targetName = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(
    characterName.value,
  );
  if (targetName == undefined) return;

  const v = store.getters.LIVE2D_MODEL_INFO(targetName);
  if (v == undefined) return;

  const previousExpression = store.getters.PREVIOUS_EXPRESSION(audioKey, v.id);
  if (previousExpression == undefined) {
    if (v.defaultExpression != undefined) {
      await setExpression(v.defaultExpression);
      expressionName.value = v.defaultExpression;
    } else {
      await setExpression("None");
      expressionName.value = "None";
    }

    return;
  }

  await setExpression(previousExpression);
  expressionName.value = previousExpression;
};

const changeLive2dModel = async () => {
  const targetName = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(
    characterName.value,
  );
  if (targetName == undefined) {
    await store.dispatch("CURRENT_SHOW_LIVE2D_IN_TALK", { isShow: false });
    await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    return false;
  }

  const v = store.getters.LIVE2D_MODEL_INFO(targetName);
  if (v != undefined) {
    // unload loaded models and load current model.
    await props.live2dManager.releaseAllLive2dModels();
    const result = await props.live2dManager.loadModel(targetName);
    if (!result) {
      return false;
    }
    await store.actions.IS_DRAWING({ isDrawing: false });

    await props.live2dManager.setCurrentModelToViewer(v.id);

    live2dExpressions.value = await props.live2dManager.getExpressionIdList(
      v.id,
    );
    live2dMotions.value = await props.live2dManager.getMotionNameList(v.id);
    await setMotion("None");
    motionFileName.value = "None";

    if (activeAudioKeyComputed.value != undefined) {
      await restoreExpression(activeAudioKeyComputed.value);
    }

    await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: true });
  } else {
    await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
  }

  console.log("changeLive2dModel in talk");
  return true;
};

const showLive2d = async () => {
  const live2dTypes = await props.live2dManager.getTypes();
  if (live2dTypes == undefined) return;
  const Live2dViewer = live2dTypes.Live2dViewer;

  const live2dViewer = props.live2dManager.getLive2dViewer();
  if (!(live2dViewer instanceof Live2dViewer) || !isLive2dInitialized.value)
    return;
  if (!isLive2dPortrait.value) return;

  const place = document.getElementsByClassName("live2d-portrait");
  if (place == undefined || place.length < 1) {
    return;
  }

  if (place.length === 1 && place[0].childElementCount === 0) {
    place[0].appendChild(props.live2dManager.getCanvas());
  }

  const result = await changeLive2dModel();
  if (!result) {
    isLive2dPortrait.value = false;
    return;
  }
  props.live2dManager.addMouseEventToLive2dCanvas();

  if (!isDrawing.value) {
    await props.live2dManager.render();
    await store.actions.IS_DRAWING({ isDrawing: true });
  }
};

const disAppearLive2d = async () => {
  await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
  isLive2dPortrait.value = false;

  props.live2dManager.removeMouseEvenet();
};

const isMaybeCanLive2dPortrait = (targetName: string): boolean => {
  const name = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(targetName);
  // return name != undefined;
  if (name == undefined) return false;

  const v = store.getters.LIVE2D_MODEL_INFO(name);
  // return v != undefined && v.isUsable;
  return v != undefined;
};

watch([isEnableLive2dFeature, isLive2dInitialized], async (newVal) => {
  const newIsEnableLive2dFeature = newVal[0];
  const newIsLive2dInitialize = newVal[1];

  if (!newIsLive2dInitialize) return;
  if (!newIsEnableLive2dFeature) {
    await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
    await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    isLive2dPortrait.value = false;
    return;
  }

  if (!isMaybeCanLive2dPortrait(characterName.value)) return;

  if (!isLive2dPortrait.value) {
    isLive2dPortrait.value = true;
    await nextTick();
  }

  await showLive2d();
});

const editorMode = computed(() => store.state.openedEditor);
watch(editorMode, async (newVal) => {
  console.log(`detect change editorMode in talk: ${newVal}`);
  if (newVal === ("song" as EditorType)) return;
  if (
    !isEnableLive2dFeature.value ||
    !isLoadedLive2dCore.value ||
    !isLive2dInitialized.value
  )
    return;
  if (!isMaybeCanLive2dPortrait(characterName.value)) return;
  isLive2dPortrait.value = true;
  await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
  await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: true });
  await nextTick();

  // ソングからトークに遷移する際にはonUpdateが発火しないのでここでLive2Dを表示させる
  await showLive2d();
});

const activeAudioKeyComputed = computed(() => store.getters.ACTIVE_AUDIO_KEY);
const prevCharacter = ref();
watch([isLoadedLive2dCore, characterName, activeAudioKeyComputed], async () => {
  await nextTick();
  if (!isLoadedLive2dCore.value) return;
  if (!isEnableLive2dFeature.value && isContinueRunLive2d.value) {
    await disAppearLive2d();
    return;
  }
  if (!isMaybeCanLive2dPortrait(characterName.value)) {
    await disAppearLive2d();
    return;
  }

  if (!isLive2dPortrait.value) {
    isLive2dPortrait.value = true;
    await nextTick();
  }

  if (
    activeAudioKeyComputed.value != undefined &&
    characterName.value != undefined
  ) {
    if (prevCharacter.value === characterName.value) {
      await restoreExpression(activeAudioKeyComputed.value);
    }
  }

  if (
    characterName.value != undefined &&
    prevCharacter.value !== characterName.value
  ) {
    prevCharacter.value = characterName.value;
  }

  if (isLive2dPortrait.value) {
    await showLive2d();
  }
});

const portraitSize: Ref<Element | undefined> = ref();
const portraitWidth = ref(0);
const portraitHeight = ref(0);
let resizeObserver: ResizeObserver | undefined = undefined;
onMounted(() => {
  if (portraitSize.value != undefined) {
    const rect = portraitSize.value.getBoundingClientRect();
    portraitWidth.value = rect.width;
    portraitHeight.value = rect.height;

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        portraitWidth.value = width;
        portraitHeight.value = height;
      }
    });
    resizeObserver.observe(portraitSize.value);
  }
});
onUnmounted(() => {
  if (resizeObserver != undefined) {
    resizeObserver.disconnect();
  }
});
watch([portraitWidth, portraitHeight], async () => {
  props.live2dManager.resizeCanvas(portraitWidth.value, portraitHeight.value);
  await props.live2dManager.initViewer();
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
