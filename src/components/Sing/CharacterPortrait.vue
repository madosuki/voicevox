<template>
  <div class="character-portrait-wrap" :class="{ hide: !isShowSinger }">
    <img
      v-if="!isEnableLive2dFeature || !isLive2dPortrait"
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
import { drawLive2dPortrait } from "@/live2d/scenes/portrait";

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
    singer.styleId
  );
  const styleInfo = characterInfo?.metas.styles.find(
    (style) => style.styleId === singer.styleId
  );
  return styleInfo?.portraitPath || characterInfo?.portraitPath;
});

const singer = computed(() => store.getters.SELECTED_TRACK.singer);
const characterName = computed(() => {
  if (singer.value == undefined) return;
  const characterInfo = store.getters.CHARACTER_INFO(
    singer.value.engineId,
    singer.value.styleId
  );
  // 初期化前・未選択時
  if (characterInfo == undefined) {
    return "（表示エラー）";
  }

  const speakerName = characterInfo.metas.speakerName;
  const styleInfo = characterInfo.metas.styles.find(
    (style) => style.styleId === singer.value?.styleId
  );
  const styleName = styleInfo?.styleName;
  return styleName
    ? formatCharacterStyleName(speakerName, styleName)
    : speakerName;
});

const isEnableLive2dFeature = computed(
  () => store.state.experimentalSetting.enableLive2dPortrait
);
const isLive2dPortrait = ref(false);
const live2dViewer = computed(() => props.getLive2dViewer());
const isShowLive2d = computed(() => store.getters.CURRENT_SHOW_IN_SONG);
const isDidDraw = computed(() => store.getters.DID_DRAW);

const changeLive2dModelIndex = () => {
  if (
    live2dViewer.value == undefined ||
    !props.isLive2dInitialized ||
    characterName.value == undefined
  )
    return;

  const targetName = props.getNameOfAvailableLive2dModel(characterName.value);
  if (targetName == undefined) return;

  const v = props.getAddedLive2dModelValue(targetName);
  if (v != undefined) {
    live2dViewer.value.setCurrentModel(v);
  }
};

const showLive2d = () => {
  if (!live2dViewer.value || !props.isLive2dInitialized) return;

  changeLive2dModelIndex();
  if (isShowLive2d.value || !isLive2dPortrait.value) {
    return;
  }
  console.log(isLive2dPortrait.value);

  const place = document.getElementsByClassName("live2d");
  if (place.length < 1) return;
  place[0].appendChild(props.live2dCanvas);
  store.dispatch("CURRENT_SHOW_IN_SONG", { isShow: true });

  if (!isDidDraw.value) {
    drawLive2dPortrait(live2dViewer.value);
    store.dispatch("DID_DRAW", { isDid: true });
  }
};

const disAppearLive2d = () => {
  store.dispatch("CURRENT_SHOW_IN_SONG", { isShow: false });
  isLive2dPortrait.value = false;
};

watch(characterName, (newVal: string | undefined) => {
  if (!props.isLoadedLive2dCore || newVal == undefined) return;

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

onUpdated(async () => {
  console.log("onUpdated in CharacterPortrait on Sing Editor");
  if (!props.isLoadedLive2dCore) return;
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

  const name = props.getNameOfAvailableLive2dModel(characterName.value);
  if (name == undefined) return;

  const v = props.getAddedLive2dModelValue(name);
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
@use '@/styles/variables' as vars;
@use '@/styles/colors' as colors;

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
