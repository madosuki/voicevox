<template>
  <div class="character-portrait-wrap" :class="{ hide: !isShowSinger }">
    <img
      v-if="!isEnableLive2dFeature || !isLoadedLive2dCore || !isLive2dPortrait"
      class="character-portrait"
      :src="portraitPath"
    />
    <div v-else class="character-portrait live2d"></div>
  </div>
</template>

<script setup lang="ts">
import { Live2dViewer } from "live2dmanager";
import { computed, ref, watch, onUpdated } from "vue";
import { useStore } from "@/store";
import { formatCharacterStyleName } from "@/store/utility";
import { Live2dSceneRenderer } from "@/live2d/scenes/renderer";
import { sceneOfPortrait } from "@/live2d/scenes/portrait";

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
const live2dViewer = computed(() => props.getLive2dViewer());
const isShowLive2d = computed(() => store.getters.CURRENT_SHOW_IN_SONG);
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
  if (isShowLive2d.value || !isLive2dPortrait.value) {
    return;
  }
  console.log(`isLive2dPortrait in song: ${isLive2dPortrait.value}`);

  const place = document.getElementsByClassName("live2d");
  if (place.length < 1) return;
  place[0].appendChild(props.live2dCanvas);
  store.dispatch("CURRENT_SHOW_IN_SONG", { isShow: true });

  if (!isDrawing.value) {
    props.live2dSceneRenderer.render(live2dViewer.value, sceneOfPortrait);
    store.dispatch("IS_DRAWING", { isDrawing: true });
  }
};

const disAppearLive2d = () => {
  store.dispatch("CURRENT_SHOW_IN_SONG", { isShow: false });
  isLive2dPortrait.value = false;
};

watch(characterName, (newVal: string | undefined) => {
  if (!isLoadedLive2dCore.value || newVal == undefined) return;

  if (!isEnableLive2dFeature.value) {
    if (isShowLive2d.value) {
      disAppearLive2d();
    }
    return;
  }

  const name = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(newVal);
  if (name == undefined) {
    disAppearLive2d();
    return;
  }

  const v = store.getters.KEY_FROM_ADDED_LIVE2D_MODEL_RECORD(name);
  if (v == undefined) {
    disAppearLive2d();
    return;
  }

  isLive2dPortrait.value = true;
});

watch(isEnableLive2dFeature, (newVal) => {
  if (!newVal) {
    isLive2dPortrait.value = false;
    return;
  }

  const targetName = characterName.value || "";
  const name = store.getters.NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY(targetName);
  if (name == undefined) {
    return;
  }

  const v = store.getters.KEY_FROM_ADDED_LIVE2D_MODEL_RECORD(name);
  if (v == undefined) {
    return;
  }

  isLive2dPortrait.value = true;
});

const editorMode = computed(() => store.state.openedEditor);

onUpdated(async () => {
  console.log("onUpdated in CharacterPortrait on Sing Editor");
  if (!isLoadedLive2dCore.value) return;
  if (
    !isEnableLive2dFeature.value ||
    isShowLive2d.value ||
    characterName.value == undefined
  ) {
    disAppearLive2d();
    return;
  }

  // WORKAROUND: トークとソングの切り替え時に何故かTalkのCharacterPortraitではなくSongのCharacterPortraitのonUpdatedが発火してしまう．
  if (editorMode.value === "talk") {
    // トークの遷移後にトーク側からcanvasを追加してもソング側の後処理なのか追加したcanvasが消されてしまうので改めて追加する
    if (store.getters.CURRENT_SHOW_IN_TALK) {
      console.log("do workaround in song for talk");
      const place = document.getElementsByClassName("live2d");
      if (place.length < 1) return;
      if (place.length === 1) {
        place[0].appendChild(props.live2dCanvas);
      }
    }
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

// 画面右下に固定表示
// 幅固定、高さ可変、画像のアスペクト比を保持、wrapのwidthに合わせてheightを調整
// bottom位置はスクロールバーの上に表示
.character-portrait-wrap {
  opacity: 0.55;
  overflow: hidden;
  contain: layout;
  pointer-events: none;
  position: fixed;
  bottom: 0;
  right: 88px;
  min-width: 200px;
  // max-width: 20vw;
  max-width: 800px;
}

.character-portrait {
  width: 100%;
  height: auto;
  backface-visibility: hidden;
}
</style>
