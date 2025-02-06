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
import { computed, ref, watch, onUpdated } from "vue";
import { useStore } from "@/store";
import { formatCharacterStyleName } from "@/store/utility";
import { sceneOfPortrait } from "@/live2d/scenes/portrait";
import { EditorType } from "@/type/preload";
import { Live2dManager } from "@/live2d/live2d";

const props = defineProps<{
  addMouseEventToLive2dCanvas: () => void;
  removeMouseEventAtLive2dCanvas: () => void;
  live2dCanvas: HTMLCanvasElement;
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

const changeLive2dModelIndex = () => {
  if (
    live2dViewer.value == undefined ||
    !isLive2dInitialized.value ||
    characterName.value == undefined
  )
    return;

  const targetName = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(
    characterName.value,
  );
  if (targetName == undefined) return;

  const v = store.getters.KEY_FROM_ADDED_LIVE2D_MODEL_RECORD(targetName);
  if (v != undefined) {
    live2dViewer.value.setCurrentModel(v);
  }
};

const showLive2d = async () => {
  if (!live2dViewer.value || !isLive2dInitialized.value) return;

  changeLive2dModelIndex();
  if (!isLive2dPortrait.value) {
    return;
  }
  console.log(`isLive2dPortrait in song: ${isLive2dPortrait.value}`);

  const place = document.getElementsByClassName("live2d-portrait");
  if (place.length < 1) return;
  place[0].appendChild(props.live2dCanvas);
  await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: true });

  if (!isDrawing.value) {
    await props.live2dManager.render(sceneOfPortrait);
    await store.dispatch("IS_DRAWING", { isDrawing: true });
  }
};

const disAppearLive2d = async () => {
  await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
  isLive2dPortrait.value = false;
};

const isCanUseLive2dPortrait = (targetName: string): boolean => {
  const live2dCharacterName =
    store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(targetName);
  if (live2dCharacterName == undefined) {
    return false;
  }

  const key =
    store.getters.KEY_FROM_ADDED_LIVE2D_MODEL_RECORD(live2dCharacterName);
  return key != undefined;
};

watch(characterName, async (newVal: string | undefined) => {
  if (!isLoadedLive2dCore.value || newVal == undefined) return;

  if (!isEnableLive2dFeature.value && isLive2dPortrait.value) {
    await disAppearLive2d();
    return;
  }

  if (!isCanUseLive2dPortrait(newVal)) {
    await disAppearLive2d();
    return;
  }

  isLive2dPortrait.value = true;
});

watch(isEnableLive2dFeature, async (newVal) => {
  if (!newVal) {
    isLive2dPortrait.value = false;
    await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
    await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    return;
  }

  const targetName = characterName.value || "";
  if (!isCanUseLive2dPortrait(targetName)) {
    return;
  }

  isLive2dPortrait.value = true;
});

const editorMode = computed(() => store.state.openedEditor);
watch(editorMode, async (newVal) => {
  console.log(`detect new val of editorMode in song: ${newVal}`);
  console.log(`characterName: ${characterName.value}`);
  if (
    newVal === ("song" as EditorType) &&
    isLoadedLive2dCore.value &&
    isEnableLive2dFeature.value &&
    characterName.value != undefined
  ) {
    await store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: true });
    await store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    // ソングからトークへ遷移すると追加していたCanvasからDOMから消えるので追加する
    console.log("do workaround when move talk to song");
    if (isCanUseLive2dPortrait(characterName.value)) {
      isLive2dPortrait.value = true;
    }
    await showLive2d();
    return;
  }
});

onUpdated(async () => {
  console.log("onUpdated in CharacterPortrait on Sing Editor");
  if (!isLoadedLive2dCore.value) return;
  if (
    (!isEnableLive2dFeature.value && isContinueRunLive2d) ||
    characterName.value == undefined
  ) {
    await disAppearLive2d();
    return;
  }

  const name = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(
    characterName.value,
  );
  if (name == undefined) return;

  const v = store.getters.KEY_FROM_ADDED_LIVE2D_MODEL_RECORD(name);
  if (v != undefined) {
    isLive2dPortrait.value = true;
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
