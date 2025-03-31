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
import { computed, watch, ref, Ref, nextTick } from "vue";
import { useStore } from "@/store";
import { AudioKey, EditorType } from "@/type/preload";
import { formatCharacterStyleName } from "@/store/utility";
import { Live2dManager } from "@/live2d/live2d";

const store = useStore();

const props = defineProps<{
  live2dManager: Live2dManager;
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
    } else {
      model.setExpression(name);
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

    live2dExpressions.value = await props.live2dManager.getExpressionIdList(
      v.id,
    );
    live2dMotions.value = await props.live2dManager.getMotionNameList(v.id);
    motionFileName.value = "None";
    if (v.defaultExpression != undefined) {
      expressionName.value = v.defaultExpression;
    } else {
      expressionName.value = "None";
    }

    await props.live2dManager.setCurrentModelToViewer(v.id);

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
  return name != undefined;
  /*
  if (name == undefined) return false;

  const v = store.getters.LIVE2D_MODEL_INFO(name);
  return v != undefined && v.isUsable;
  */
};

watch(isEnableLive2dFeature, async (newVal) => {
  if (!newVal) {
    await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
    await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    isLive2dPortrait.value = false;
    return;
  }

  if (!isMaybeCanLive2dPortrait(characterName.value)) return;

  if (!isLive2dPortrait.value) {
    isLive2dPortrait.value = true;
    await nextTick();
    await showLive2d();
  }
});

const editorMode = computed(() => store.state.openedEditor);
watch(editorMode, async (newVal) => {
  console.log(`editorMode: ${newVal}`);
  console.log("in talk");
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

watch([isLoadedLive2dCore, characterName], async () => {
  await nextTick();
  if (!isLoadedLive2dCore.value) return;
  if (!isEnableLive2dFeature.value && isContinueRunLive2d.value) {
    await disAppearLive2d();
    return;
  }

  if (isEnableLive2dFeature.value) {
    if (isMaybeCanLive2dPortrait(characterName.value)) {
      if (!isLive2dPortrait.value) {
        isLive2dPortrait.value = true;
        await nextTick();
      }
    } else {
      await disAppearLive2d();
    }

    if (isLive2dPortrait.value) {
      await showLive2d();
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
