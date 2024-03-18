import { Live2dStoreState, Live2dStoreTypes } from "./type";
import { createPartialStore } from "./vuex";

export const live2dStoreState: Live2dStoreState = {
  latestUseCharacterKeyInTalk: "",
  isCurrentShowInTalk: false,
  isCurrentShowInSong: false,
  isDidDraw: false,
  isLive2dInitialized: false,
  isLive2dCoreLoaded: false,
  preparableLive2dModelArray: [
    "ずんだもん",
    "春日部つむぎ",
    "九州そら",
    "中国うさぎ",
  ],
  addedLive2dModelNameRecord: {},
};

export const live2dStore = createPartialStore<Live2dStoreTypes>({
  LATEST_USE_CHARACTER_KEY_IN_TALK: {
    mutation(state, { key }: { key: string }) {
      state.latestUseCharacterKeyInTalk = key;
    },
    action({ commit }, { key }: { key: string }) {
      commit("LATEST_USE_CHARACTER_KEY_IN_TALK", { key });
    },
    getter(state) {
      return state.latestUseCharacterKeyInTalk;
    },
  },

  CURRENT_SHOW_IN_TALK: {
    mutation(state, { isShow }: { isShow: boolean }) {
      state.isCurrentShowInTalk = isShow;
    },
    action({ commit }, { isShow }: { isShow: boolean }) {
      commit("CURRENT_SHOW_IN_TALK", { isShow });
    },
    getter(state) {
      return state.isCurrentShowInTalk;
    },
  },

  CURRENT_SHOW_IN_SONG: {
    mutation(state, { isShow }: { isShow: boolean }) {
      state.isCurrentShowInSong = isShow;
    },
    action({ commit }, { isShow }: { isShow: boolean }) {
      commit("CURRENT_SHOW_IN_SONG", { isShow });
    },
    getter(state) {
      return state.isCurrentShowInSong;
    },
  },

  DID_DRAW: {
    mutation(state, { isDid }: { isDid: boolean }) {
      state.isDidDraw = isDid;
    },
    action({ commit }, { isDid }: { isDid: boolean }) {
      commit("DID_DRAW", { isDid });
    },
    getter(state) {
      return state.isDidDraw;
    },
  },

  LIVE2D_INITIALIZED: {
    mutation(state, { isLive2dInitialized }: { isLive2dInitialized: boolean }) {
      state.isLive2dInitialized = isLive2dInitialized;
    },
    action(
      { commit },
      { isLive2dInitialized }: { isLive2dInitialized: boolean }
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

  NAME_FROM_PREPARABLE_LIVE2D_MODEL_ARRAY: {
    getter: (state) => (name) => {
      return state.preparableLive2dModelArray.find((v) => name.includes(v));
    },
  },

  ADDED_LIVE2D_MODEL_RECORD: {
    mutation(state, { name, key }: { name: string; key: string }) {
      state.addedLive2dModelNameRecord[name] = key;
    },
    action({ commit }, { name, key }: { name: string; key: string }) {
      commit("ADDED_LIVE2D_MODEL_RECORD", { name, key });
    },
  },

  KEY_FROM_ADDED_LIVE2D_MODEL_RECORD: {
    getter: (state) => (name) => {
      return state.addedLive2dModelNameRecord[name];
    },
  },
});
