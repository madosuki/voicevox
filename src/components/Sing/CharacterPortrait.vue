<template>
  <div class="character-portrait-wrap" :class="{ hide: !isShowSinger }">
    <img
      v-if="!isEnableLive2dFeature || !isLoadedLive2dCore || !isLive2dPortrait"
      class="character-portrait"
      :src="portraitPath"
    />
    <div v-else class="character-portrait live2d-portrait"></div>
  </div>
</template>

<script setup lang="ts">
import { Live2dViewer } from "live2dmanager";
import { computed, ref, watch, onUpdated } from "vue";
import { useStore } from "@/store";
import { formatCharacterStyleName } from "@/store/utility";
import { Live2dSceneRenderer } from "@/live2d/renderer";
import { sceneOfPortrait } from "@/live2d/scenes/portrait";
import { EditorType } from "@/type/preload";

const props = defineProps<{
  getLive2dViewer: () => Live2dViewer | undefined;
  addMouseEventToLive2dCanvas: () => void;
  removeMouseEventAtLive2dCanvas: () => void;
  live2dCanvas: HTMLCanvasElement;
  live2dSceneRenderer: Live2dSceneRenderer;
}>();

const store = useStore();
const isShowSinger = computed(() => store.state.isShowSinger);

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
const live2dViewer = computed(() => props.getLive2dViewer());
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

const showLive2d = () => {
  if (!live2dViewer.value || !isLive2dInitialized.value) return;

  changeLive2dModelIndex();
  if (!isLive2dPortrait.value) {
    return;
  }
  console.log(`isLive2dPortrait in song: ${isLive2dPortrait.value}`);

  const place = document.getElementsByClassName("live2d-portrait");
  if (place.length < 1) return;
  place[0].appendChild(props.live2dCanvas);
  store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: true });

  if (!isDrawing.value) {
    props.live2dSceneRenderer.render(live2dViewer.value, sceneOfPortrait);
    store.dispatch("IS_DRAWING", { isDrawing: true });
  }
};

const disAppearLive2d = () => {
  store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
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

watch(characterName, (newVal: string | undefined) => {
  if (!isLoadedLive2dCore.value || newVal == undefined) return;

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
    isLive2dPortrait.value = false;
    store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: false });
    store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    return;
  }

  const targetName = characterName.value || "";
  if (!isCanUseLive2dPortrait(targetName)) {
    return;
  }

  isLive2dPortrait.value = true;
});

const editorMode = computed(() => store.state.openedEditor);
watch(editorMode, (newVal) => {
  console.log(`detect new val of editorMode in song: ${newVal}`);
  console.log(`characterName: ${characterName.value}`);
  if (
    newVal === ("song" as EditorType) &&
    isLoadedLive2dCore.value &&
    isEnableLive2dFeature.value &&
    characterName.value != undefined
  ) {
    store.actions.CURRENT_SHOW_LIVE2D_IN_SONG({ isShow: true });
    store.actions.CURRENT_SHOW_LIVE2D_IN_TALK({ isShow: false });
    // ソングからトークへ遷移すると追加していたCanvasからDOMから消えるので追加する
    console.log("do workaround when move talk to song");
    if (isCanUseLive2dPortrait(characterName.value)) {
      isLive2dPortrait.value = true;
    }
    showLive2d();
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
    disAppearLive2d();
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
    disAppearLive2d();
  }

  if (isLive2dPortrait.value) {
    showLive2d();
  }
});
</script>

<style scoped lang="scss">
@use "@/styles/variables" as vars;
@use "@/styles/colors" as colors;

// 表示変数
$header-margin: vars.$toolbar-height + vars.$menubar-height + 30px; // 30pxはルーラーの高さ
$right-margin: 24px;
$portrait-max-width: 40vw;
$portrait-max-height: 60vh;
$portrait-min-height: 500px;

// 画面右下に固定表示
// 幅固定、高さ可変、画像のアスペクト比を保持、wrapのwidthに合わせてheightを調整
// bottom位置はスクロールバーの上に表示
.character-portrait-wrap {
  opacity: 0.55;
  overflow: visible;
  contain: layout;
  pointer-events: none;
  position: fixed;
  display: grid;
  place-items: end;
  bottom: 0;
  right: $right-margin;
  min-width: 200px;
  // max-width: 20vw;
  max-width: 800px;
}

.character-portrait {
  width: auto;
  height: $portrait-max-height;
  min-height: $portrait-min-height;
  max-width: $portrait-max-width;
  overflow: visible;
  backface-visibility: hidden;
  object-fit: cover;
  object-position: top center;
}

// ポートレートサイズが画面サイズを超えた場合、ヘッダーを考慮してポートレートを上部基準で表示させる
// ヘッダー高さ120px+ポートレート高さ500pxだとする
@media (max-height: #{calc(#{$portrait-min-height} + #{$header-margin})}) {
  .character-portrait-wrap {
    top: $header-margin; // ヘッダーの高さより下に位置させる
    bottom: auto;
    height: calc(100vh - #{$header-margin});
    place-items: start end;
  }
}
</style>
