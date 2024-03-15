import { Live2dStoreState, Live2dStoreTypes } from "./type";
import { createPartialStore } from "./vuex";

export const live2dStoreState: Live2dStoreState = {
  latestUseCharacterKeyInTalk: "",
  isCurrentShowInTalk: false,
};

export const live2dStore = createPartialStore<Live2dStoreTypes>({
  LATEST_USE_CHARACTER_KEY_IN_TALK: {
    mutation(state, { key }: { key: string }) {
      state.latestUseCharacterKey = key;
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
});
