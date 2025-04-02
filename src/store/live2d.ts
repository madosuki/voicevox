import { Live2dStoreState, Live2dStoreTypes } from "./type";
import { createPartialStore } from "./vuex";
import { AudioKey, Live2dModelInfo, SpeakerId } from "@/type/preload";

export const live2dStoreState: Live2dStoreState = {
  latestUseCharacterKeyInTalk: "",
  isCurrentShowInTalk: false,
  isCurrentShowInSong: false,
  isDrawing: false,
  isLive2dInitialized: false,
  isLive2dCoreLoaded: false,

  // Live2Dモデルが利用可能なキャラクターを指すリスト。CharacterPortraitでのキャラクター変更時等に使用される。
  canUseLive2dModelArray: [
    "四国めたん",
    "ずんだもん",
    "春日部つむぎ",
    "雨晴はう",
    "波音リツ",
    "九州そら",
    "中国うさぎ",
  ],

  live2dModelInfoRecord: {},
  previousExpressionNameRecord: {},
};

export const live2dStore = createPartialStore<Live2dStoreTypes>({
  LIVE2D_MODEL_INFO: {
    mutation(state, { name, info }: { name: string; info: Live2dModelInfo }) {
      state.live2dModelInfoRecord[name] = info;
    },
    action(
      { commit },
      { name, info }: { name: string; info: Live2dModelInfo },
    ) {
      commit("LIVE2D_MODEL_INFO", { name, info });
    },
    getter: (state) => (name) => {
      return state.live2dModelInfoRecord[name];
    },
  },

  CURRENT_SHOW_LIVE2D_IN_TALK: {
    mutation(state, { isShow }: { isShow: boolean }) {
      state.isCurrentShowInTalk = isShow;
    },
    action({ commit }, { isShow }: { isShow: boolean }) {
      commit("CURRENT_SHOW_LIVE2D_IN_TALK", { isShow });
    },
    getter(state) {
      return state.isCurrentShowInTalk;
    },
  },

  CURRENT_SHOW_LIVE2D_IN_SONG: {
    mutation(state, { isShow }: { isShow: boolean }) {
      state.isCurrentShowInSong = isShow;
    },
    action({ commit }, { isShow }: { isShow: boolean }) {
      commit("CURRENT_SHOW_LIVE2D_IN_SONG", { isShow });
    },
    getter(state) {
      return state.isCurrentShowInSong;
    },
  },

  IS_DRAWING: {
    mutation(state, { isDrawing }: { isDrawing: boolean }) {
      state.isDrawing = isDrawing;
    },
    action({ commit }, { isDrawing }: { isDrawing: boolean }) {
      commit("IS_DRAWING", { isDrawing });
    },
    getter(state) {
      return state.isDrawing;
    },
  },

  LIVE2D_INITIALIZED: {
    mutation(state, { isLive2dInitialized }: { isLive2dInitialized: boolean }) {
      state.isLive2dInitialized = isLive2dInitialized;
    },
    action(
      { commit },
      { isLive2dInitialized }: { isLive2dInitialized: boolean },
    ) {
      commit("LIVE2D_INITIALIZED", { isLive2dInitialized });
    },
    getter(state) {
      return state.isLive2dInitialized;
    },
  },

  LIVE2D_CORE_LOADED: {
    mutation(state, { isLive2dLoaded }: { isLive2dLoaded: boolean }) {
      state.isLive2dCoreLoaded = isLive2dLoaded;
    },
    action({ commit }, { isLive2dLoaded }: { isLive2dLoaded: boolean }) {
      commit("LIVE2D_CORE_LOADED", { isLive2dLoaded });
    },
    getter(state) {
      return state.isLive2dCoreLoaded;
    },
  },

  NAME_FROM_CAN_USE_LIVE2D_MODEL_ARRAY: {
    getter: (state) => (name) => {
      return state.canUseLive2dModelArray.find((v) => name.includes(v));
    },
  },

  CAN_USE_LIVE2D_MODEL_ARRAY: {
    getter(state) {
      return state.canUseLive2dModelArray;
    },
  },

  PREVIOUS_EXPRESSION: {
    mutation(
      state,
      {
        audioKey,
        speakerId,
        expressionName,
      }: { audioKey: AudioKey; speakerId: SpeakerId; expressionName: string },
    ) {
      if (state.previousExpressionNameRecord[audioKey] == undefined) {
        const record: Record<SpeakerId, string> = {};
        record[speakerId] = expressionName;
        state.previousExpressionNameRecord[audioKey] = record;
        return;
      }

      state.previousExpressionNameRecord[audioKey][speakerId] = expressionName;
    },
    action(
      { commit },
      {
        audioKey,
        speakerId,
        expressionName,
      }: { audioKey: AudioKey; speakerId: SpeakerId; expressionName: string },
    ) {
      commit("PREVIOUS_EXPRESSION", {
        audioKey,
        speakerId,
        expressionName,
      });
    },
    getter: (state) => (audioKey, speakerId) => {
      if (state.previousExpressionNameRecord[audioKey] == undefined)
        return undefined;

      return state.previousExpressionNameRecord[audioKey][speakerId];
    },
  },

  DELETE_PREVIOUS_EXPRESSION: {
    mutation(state, { audioKey }: { audioKey: AudioKey }) {
      delete state.previousExpressionNameRecord[audioKey];
    },
    action({ commit }, { audioKey }: { audioKey: AudioKey }) {
      commit("DELETE_PREVIOUS_EXPRESSION", { audioKey });
    },
  },
});
