<template>
  <div v-if="showSingCharacterPortrait" class="clipping-container">
    <div class="character-portrait-wrap">
      <img
        v-if="
          !isEnableLive2dFeature || !isLoadedLive2dCore || !isLive2dPortrait
        "
        class="character-portrait"
        :src="portraitPath"
      />
      <div v-else class="character-portrait live2d-portrait"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { useStore } from "@/store";
import { formatCharacterStyleName } from "@/store/utility";
import { EditorType } from "@/type/preload";
import { Live2dManager } from "@/live2d/live2d";

const props = defineProps<{
  live2dManager: Live2dManager;
}>();

const store = useStore();
const showSingCharacterPortrait = computed(
  () => store.state.showSingCharacterPortrait,
);

const portraitPath = computed(() => {
  const userOrderedCharacterInfos =
    store.getters.USER_ORDERED_CHARACTER_INFOS("singerLike");
  const singer = store.getters.SELECTED_TRACK.singer;
  if (!userOrderedCharacterInfos || !singer) {
    return undefined;
  }
  const characterInfo = store.getters.CHARACTER_INFO(
    singer.engineId,
    singer.styleId,
  );
  const styleInfo = characterInfo?.metas.styles.find(
    (style) => style.styleId === singer.styleId,
  );
  return styleInfo?.portraitPath || characterInfo?.portraitPath;
});

const singer = computed(() => store.getters.SELECTED_TRACK.singer);
const characterName = computed(() => {
  if (singer.value == undefined) return;
  const characterInfo = store.getters.CHARACTER_INFO(
    singer.value.engineId,
    singer.value.styleId,
  );
  // 初期化前・未選択時
  if (characterInfo == undefined) {
    return "（表示エラー）";
  }

  const speakerName = characterInfo.metas.speakerName;
  const styleInfo = characterInfo.metas.styles.find(
    (style) => style.styleId === singer.value?.styleId,
  );
  const styleName = styleInfo?.styleName;
  return styleName
    ? formatCharacterStyleName(speakerName, styleName)
    : speakerName;
});

const isEnableLive2dFeature = computed(
  () => store.state.experimentalSetting.enableLive2dPortrait,
);
const isLive2dPortrait = ref(false);
const isContinueRunLive2d = computed(
  () =>
    store.getters.CURRENT_SHOW_LIVE2D_IN_SONG ||
    store.getters.CURRENT_SHOW_LIVE2D_IN_TALK,
);
const live2dViewer = computed(() => props.live2dManager.getLive2dViewer());
const isDrawing = computed(() => store.getters.IS_DRAWING);
const isLive2dInitialized = computed(() => store.getters.LIVE2D_INITIALIZED);
const isLoadedLive2dCore = computed(() => store.getters.LIVE2D_CORE_LOADED);

const changeLive2dModel = async (): Promise<boolean> => {
  if (
    live2dViewer.value == undefined ||
    !isLive2dInitialized.value ||
    characterName.value == undefined
  )
    return false;

  const targetName = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(
    characterName.value,
  );
  if (targetName == undefined) return false;

  const v = store.getters.LIVE2D_MODEL_INFO(targetName);
  if (v != undefined) {
    console.log("nyan");
    // unload loaded models and load current model.
    await props.live2dManager.releaseAllLive2dModels();
    const result = await props.live2dManager.loadModel(targetName);
    if (!result) {
      return false;
    }
    await store.actions.IS_DRAWING({ isDrawing: false });

    await props.live2dManager.setCurrentModelToViewer(v.id);
  }

  return true;
};

const showLive2d = async () => {
  console.log("show live2d");
  if (!live2dViewer.value || !isLive2dInitialized.value) return;
  if (!isLive2dPortrait.value) {
    return;
  }

  const place = document.getElementsByClassName("live2d-portrait");
  if (place.length < 1) return;
  if (place[0].childElementCount < 1) {
    window.backend.logInfo("append live2d canvas on sing");
    place[0].appendChild(props.live2dManager.getCanvas());
  }

  const result = await changeLive2dModel();
  if (!result) {
    isLive2dPortrait.value = false;
    return;
  }
  await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: true });

  if (!isDrawing.value) {
    await props.live2dManager.render();
    await store.dispatch("IS_DRAWING", { isDrawing: true });
  }
};

const disAppearLive2d = async () => {
  await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
  isLive2dPortrait.value = false;
};

const isMaybeCanLive2dPortrait = (targetName: string): boolean => {
  const live2dCharacterName =
    store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(targetName);
  // return live2dCharacterName != undefined;
  if (live2dCharacterName == undefined) {
    return false;
  }

  const v = store.getters.LIVE2D_MODEL_INFO(live2dCharacterName);
  // return v != undefined && v.isUsable;
  return v != undefined;
};

watch([isEnableLive2dFeature, isLive2dInitialized], async (newVal) => {
  const newIsEnableLive2dFeature = newVal[0];
  const newIsLive2dInitialize = newVal[1];

  if (!newIsLive2dInitialize) return;
  if (!newIsEnableLive2dFeature) {
    isLive2dPortrait.value = false;
    await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
    await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    return;
  }

  const targetName = characterName.value || "";
  if (!isMaybeCanLive2dPortrait(targetName)) {
    return;
  }

  isLive2dPortrait.value = true;
  await nextTick();

  await showLive2d();
});

const editorMode = computed(() => store.state.openedEditor);
watch(editorMode, async (newVal) => {
  console.log(`detect new val of editorMode in song: ${newVal}`);
  console.log(`characterName: ${characterName.value}`);
  if (newVal === ("talk" as EditorType)) return;
  if (
    newVal === ("song" as EditorType) &&
    isLoadedLive2dCore.value &&
    isEnableLive2dFeature.value &&
    characterName.value != undefined &&
    isMaybeCanLive2dPortrait(characterName.value)
  ) {
    await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: true });
    await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    // ソングからトークへ遷移すると追加していたCanvasがDOMから消えるので追加する
    isLive2dPortrait.value = true;
    await nextTick();
    await showLive2d();
    return;
  }
});

watch([isLoadedLive2dCore, characterName], async () => {
  await nextTick();
  if (!isLoadedLive2dCore.value) return;
  if (
    (!isEnableLive2dFeature.value && isContinueRunLive2d) ||
    characterName.value == undefined
  ) {
    await disAppearLive2d();
    return;
  }

  if (isMaybeCanLive2dPortrait(characterName.value)) {
    isLive2dPortrait.value = true;
    await nextTick();
  } else {
    await disAppearLive2d();
  }

  if (isLive2dPortrait.value) {
    await showLive2d();
  }
});
</script>

<style scoped lang="scss">
@use "@/styles/variables" as vars;
@use "@/styles/colors" as colors;

// 表示変数
$portrait-min-height: 500px;

// 画像がはみ出ないようにクリップする
.clipping-container {
  position: relative;
  display: grid;
  overflow: hidden;
  pointer-events: none;
}

// 画面右下に固定表示
// 幅固定、高さ可変、画像のアスペクト比を保持、heightを調整
.character-portrait-wrap {
  display: flex;
  flex-direction: column;
  margin-left: auto;
  overflow: hidden;
}

// 通常は下部基準だが、親要素が最小高さより小さい場合は上部基準とし頭を残して足から隠れさせる
.character-portrait {
  display: block;
  margin-top: auto;
  min-height: max(75%, $portrait-min-height);
  opacity: 0.55;
  backface-visibility: hidden;
  object-fit: contain;
}
</style>
