import { Live2dSceneRenderer } from "./renderer";
import { sceneOfPortrait } from "./scenes/portrait";
import { Live2dModelInfo, SpeakerId } from "@/type/preload";
import { Store } from "@/store";

async function readFileFunction(filePath: string): Promise<ArrayBuffer> {
  if (import.meta.env.VITE_TARGET === "electron") {
    const result = await window.backend.readFile({ filePath });
    if (result.ok) {
      const buf = result.value.buffer;
      return buf as ArrayBuffer;
    }
    return new ArrayBuffer(0);
  } else {
    // for browser mode
    try {
      const res = await fetch(filePath);
      return await res.arrayBuffer();
    } catch (e) {
      window.backend.logError(e);
      return new ArrayBuffer(0);
    }
  }
}

export class Live2dManager {
  canvas: HTMLCanvasElement;
  live2dViewer: unknown;
  isLoadedLive2dCore: boolean;
  isFailedLive2dLoadCore: boolean;
  store: Store;
  live2dSceneRenderer: Live2dSceneRenderer;
  isClicked: boolean;

  constructor(canvas: HTMLCanvasElement, store: Store) {
    this.live2dViewer = undefined;
    this.isLoadedLive2dCore = false;
    this.store = store;
    this.live2dSceneRenderer = new Live2dSceneRenderer();
    this.isClicked = false;
    this.isFailedLive2dLoadCore = false;
    this.canvas = canvas;

    this.onTouchesEventListener = this.onTouches.bind(this);
    this.onTouchEndEventListener = this.onTouchEnd.bind(this);
    this.onTouchMovedEventListener = this.onTouchMoved.bind(this);
  }

  getCanvas() {
    return this.canvas;
  }

  async TouchesBegin(pageX: number, pageY: number) {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    if (!(this.live2dViewer instanceof Live2dViewer)) return;
    this.isClicked = true;

    this.live2dViewer.onTouchesBegin(pageX, pageY);

    const modelKey = this.live2dViewer.getCurrentModelKey();
    const model = this.live2dViewer.getModelFromKey(modelKey);
    const n = Math.floor(Math.random() * 3);
    if (model) {
      model.stopKeepEyeValue();
      switch (n) {
        case 1:
          model.closeEyelids();
          setTimeout(() => model.openEyelids(), 500);
          break;
        case 2: {
          model.keepEyeOpenParams({
            lOpen: 0.8,
            rOpen: 0.8,
          });
          setTimeout(() => model.stopKeepEyeValue(), 1000);
          break;
        }
      }
    }
  }
  onTouches(event: PointerEvent): void {
    void this.TouchesBegin(event.pageX, event.pageY);
  }
  private onTouchesEventListener: (
    this: HTMLCanvasElement,
    event: PointerEvent,
  ) => void;

  async TouchEnd() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    if (!(this.live2dViewer instanceof Live2dViewer)) return;

    this.isClicked = false;
    this.live2dViewer.onTouchesEnded();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTouchEnd(event: PointerEvent) {
    void this.TouchEnd();
  }
  onTouchEndEventListener: (
    this: HTMLCanvasElement,
    event: PointerEvent,
  ) => void;

  async TouchMoved(pageX: number, pageY: number) {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    if (!(this.live2dViewer instanceof Live2dViewer)) return;

    if (this.isClicked) {
      this.live2dViewer.onTouchesMoved(pageX, pageY);
    }
  }
  onTouchMoved(event: PointerEvent) {
    void this.TouchMoved(event.pageX, event.pageY);
  }
  onTouchMovedEventListener: (
    this: HTMLCanvasElement,
    event: PointerEvent,
  ) => void;

  addMouseEventToLive2dCanvas() {
    this.canvas.addEventListener("pointerdown", this.onTouchesEventListener, {
      passive: true,
    });
    this.canvas.addEventListener("pointerup", this.onTouchEndEventListener, {
      passive: true,
    });
    this.canvas.addEventListener("pointerleave", this.onTouchEndEventListener, {
      passive: true,
    });
    this.canvas.addEventListener(
      "pointermove",
      this.onTouchMovedEventListener,
      { passive: true },
    );
  }
  removeMouseEvenet() {
    this.canvas.removeEventListener("pointerdown", this.onTouchesEventListener);
    this.canvas.removeEventListener("pointerup", this.onTouchEndEventListener);
    this.canvas.removeEventListener(
      "pointerleave",
      this.onTouchEndEventListener,
    );
    this.canvas.removeEventListener(
      "pointermove",
      this.onTouchMovedEventListener,
    );
  }

  async setCurrentModelToViewer(key: string) {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;
    if (this.live2dViewer instanceof Live2dViewer) {
      this.live2dViewer.setCurrentModel(key);
    }
  }

  async render() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;
    if (this.live2dViewer instanceof Live2dViewer) {
      this.live2dSceneRenderer.render(this.live2dViewer, sceneOfPortrait);
    }

    return;
  }

  async getTypes() {
    if (this.isFailedLive2dLoadCore) return undefined;

    const { Live2dViewer, Live2dModel, Live2dMotionSyncModel } = await import(
      "live2dmanager"
    )
      .then((m) => {
        return {
          Live2dViewer: m.Live2dViewer,
          Live2dModel: m.Live2dModel,
          Live2dMotionSyncModel: m.Live2dMotionSyncModel,
        };
      })
      .catch((e) => {
        window.backend.logError(e);
        this.isFailedLive2dLoadCore = true;
        return {
          Live2dViewer: undefined,
          Live2dModel: undefined,
          Live2dMotionSyncModel: undefined,
        };
      });

    if (
      Live2dViewer == undefined ||
      Live2dModel == undefined ||
      Live2dMotionSyncModel == undefined
    )
      return undefined;

    return { Live2dViewer, Live2dModel, Live2dMotionSyncModel };
  }

  async initViewer() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;

    try {
      const allocationMemory = 1024 * 1024 * 32;
      this.live2dViewer = new Live2dViewer(this.canvas, 800, 800);
      if (this.live2dViewer instanceof Live2dViewer) {
        this.live2dViewer.initialize(allocationMemory);
      }
      this.isLoadedLive2dCore = true;
      await this.store.dispatch("LIVE2D_CORE_LOADED", { isLive2dLoaded: true });
    } catch (e) {
      window.backend.logError(e);
    }
  }

  getLive2dViewer() {
    if (!this.isLoadedLive2dCore) return undefined;

    return this.live2dViewer;
  }

  async getMotionNameList(name: string): Promise<string[]> {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return [];

    const Live2dViewer = live2dTypes.Live2dViewer;
    const Live2dModel = live2dTypes.Live2dModel;
    const Live2dMotionSyncModel = live2dTypes.Live2dMotionSyncModel;

    const live2dViewer = this.live2dViewer;
    if (
      live2dViewer != undefined &&
      live2dViewer instanceof Live2dViewer &&
      Live2dModel != undefined &&
      Live2dMotionSyncModel != undefined
    ) {
      const model = live2dViewer.getModelFromKey(name);
      if (model != undefined) {
        return model.getMotionFileNameList();
      }
    }
    return [];
  }

  async getExpressionIdList(name: string): Promise<string[]> {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return [];

    const Live2dViewer = live2dTypes.Live2dViewer;
    const Live2dModel = live2dTypes.Live2dModel;
    const Live2dMotionSyncModel = live2dTypes.Live2dMotionSyncModel;

    const live2dViewer = this.live2dViewer;
    if (
      live2dViewer != undefined &&
      live2dViewer instanceof Live2dViewer &&
      Live2dModel != undefined &&
      Live2dMotionSyncModel != undefined
    ) {
      const model = live2dViewer.getModelFromKey(name);
      if (model != undefined) {
        return ["None", ...model.getExpressionIdList()];
      }
    }
    return [];
  }

  async initializeLive2dModelInfoRecord() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    const Live2dModel = live2dTypes.Live2dModel;
    const Live2dMotionSyncModel = live2dTypes.Live2dMotionSyncModel;

    const live2dViewer = this.live2dViewer;
    const store = this.store;

    if (
      live2dViewer != undefined &&
      live2dViewer instanceof Live2dViewer &&
      Live2dModel != undefined &&
      Live2dMotionSyncModel != undefined
    ) {
      const live2dAssetsPath = await window.backend.getLive2dAssetsPath();

      // Live2Dモデルをキャラクターに割り当てるにはここだけではなく store/live2d.tsのcanUseLive2dModelArrayも変更すること

      const metanInfo: Live2dModelInfo = {
        id: "7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff" as SpeakerId,
        isUsable: false,
        dirPath: live2dAssetsPath + "/四国めたん_vts/",
        modelJsonName: "四国めたん.model3.json",
        lipSyncWait: 10,
      };
      await store.actions.LIVE2D_MODEL_INFO({
        name: "四国めたん",
        info: metanInfo,
      });

      const zundamonInfo: Live2dModelInfo = {
        id: "388f246b-8c41-4ac1-8e2d-5d79f3ff56d9" as SpeakerId,
        isUsable: false,
        dirPath: live2dAssetsPath + "/Zundamon_vts/",
        modelJsonName: "zundamon.model3.json",
        lipSyncWait: 20,
      };
      await store.actions.LIVE2D_MODEL_INFO({
        name: "ずんだもん",
        info: zundamonInfo,
      });

      const kasukabeTsumugiInfo: Live2dModelInfo = {
        id: "35b2c544-660e-401e-b503-0e14c635303a" as SpeakerId,
        isUsable: false,
        dirPath: live2dAssetsPath + "/春日部つむぎ公式live2Dモデル/",
        modelJsonName: "春日部つむぎ公式live2Dモデル.model3.json",
        lipSyncWait: 15,
        isOldParamName: true,
      };
      await store.actions.LIVE2D_MODEL_INFO({
        name: "春日部つむぎ",
        info: kasukabeTsumugiInfo,
      });

      const kyuusyuuSoraInfo: Live2dModelInfo = {
        id: "481fb609-6446-4870-9f46-90c4dd623403" as SpeakerId,
        isUsable: false,
        dirPath: live2dAssetsPath + "/Sora_vts/",
        modelJsonName: "kyuusyuu_sora.model3.json",
        lipSyncWait: 20,
      };
      await store.actions.LIVE2D_MODEL_INFO({
        name: "九州そら",
        info: kyuusyuuSoraInfo,
      });

      const chugokuUsagiInfo: Live2dModelInfo = {
        id: "1f18ffc3-47ea-4ce0-9829-0576d03a7ec8" as SpeakerId,
        isUsable: false,
        dirPath: live2dAssetsPath + "/Usagi_vts/",
        modelJsonName: "usagi.model3.json",
        lipSyncWait: 20,
        defaultExpression: "Inaba",
      };
      await store.actions.LIVE2D_MODEL_INFO({
        name: "中国うさぎ",
        info: chugokuUsagiInfo,
      });

      // モーションが動作するか検証するためにLive2dのサンプルモデルを使用。便宜上雨晴はうに。
      const hauInfo: Live2dModelInfo = {
        id: "3474ee95-c274-47f9-aa1a-8322163d96f1" as SpeakerId,
        isUsable: false,
        dirPath: live2dAssetsPath + "/Mao/",
        modelJsonName: "Mao.model3.json",
        lipSyncWait: 10,
      };
      await store.actions.LIVE2D_MODEL_INFO({
        name: "雨晴はう",
        info: hauInfo,
      });

      // Motion Sync サンプル。波音リツに割り当てているのは雨晴はうの時と同様の理由。
      const ritsuInfo: Live2dModelInfo = {
        id: "b1a81618-b27b-40d2-b0ea-27a9ad408c4b" as SpeakerId,
        isUsable: false,
        dirPath: live2dAssetsPath + "/Kei_basic/",
        modelJsonName: "Kei_basic.model3.json",
      };
      await store.actions.LIVE2D_MODEL_INFO({
        name: "波音リツ",
        info: ritsuInfo,
      });
    }
  }

  async loadModel(name: string) {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    const Live2dModel = live2dTypes.Live2dModel;
    const Live2dMotionSyncModel = live2dTypes.Live2dMotionSyncModel;

    const live2dViewer = this.live2dViewer;
    const store = this.store;

    if (
      live2dViewer != undefined &&
      live2dViewer instanceof Live2dViewer &&
      Live2dModel != undefined &&
      Live2dMotionSyncModel != undefined
    ) {
      const info = store.getters.LIVE2D_MODEL_INFO(name);
      if (info == undefined) return;
      const model = new Live2dModel(
        info.dirPath,
        info.modelJsonName,
        live2dViewer,
        readFileFunction,
        info.isOldParamName,
      );

      try {
        await model.loadAssets();
      } catch (e: unknown) {
        if (e instanceof Error) {
          window.backend.logError(
            `Error when load ${name} live2d model assets: ${e}`,
          );
        }
      }

      if (info.lipSyncWait != undefined) {
        model.setLipSyncWeight(info.lipSyncWait);
      }

      live2dViewer.addModel(info.id, model);
      const updateInfo: Live2dModelInfo = {
        id: info.id,
        isUsable: true,
        dirPath: info.dirPath,
        modelJsonName: info.modelJsonName,
        lipSyncWait: info.lipSyncWait ? info.lipSyncWait : undefined,
        isOldParamName: info.isOldParamName,
      };
      await store.actions.LIVE2D_MODEL_INFO({
        name: name,
        info: updateInfo,
      });

      if (info.defaultExpression != undefined) {
        model.setExpression(info.defaultExpression);
      }
    }
  }

  async loadAllModels() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    const Live2dModel = live2dTypes.Live2dModel;
    const Live2dMotionSyncModel = live2dTypes.Live2dMotionSyncModel;

    const live2dViewer = this.live2dViewer;
    const store = this.store;

    if (
      live2dViewer != undefined &&
      live2dViewer instanceof Live2dViewer &&
      Live2dModel != undefined &&
      Live2dMotionSyncModel != undefined
    ) {
      const targets = store.getters.CAN_USE_LIVE2D_MODEL_ARRAY;
      for (const name of targets) {
        const info = store.getters.LIVE2D_MODEL_INFO(name);
        if (info == undefined) continue;

        const model = new Live2dModel(
          info.dirPath,
          info.modelJsonName,
          live2dViewer,
          readFileFunction,
          info.isOldParamName,
        );
        model
          .loadAssets()
          .then(async () => {
            if (live2dViewer == undefined) return;
            if (info.lipSyncWait != undefined) {
              model.setLipSyncWeight(info.lipSyncWait);
            }
            live2dViewer.addModel(info.id, model);
            const updateInfo: Live2dModelInfo = {
              id: info.id,
              isUsable: true,
              dirPath: info.dirPath,
              modelJsonName: info.modelJsonName,
              lipSyncWait: info.lipSyncWait ? info.lipSyncWait : undefined,
              isOldParamName: info.isOldParamName,
            };
            await store.actions.LIVE2D_MODEL_INFO({
              name: name,
              info: updateInfo,
            });

            if (info.defaultExpression != undefined) {
              model.setExpression(info.defaultExpression);
            }
          })
          .catch((e) => {
            window.backend.logError(
              `Error when load ${name} live2d model assets: ${e}`,
            );
          });
      }

      const info = store.getters.LIVE2D_MODEL_INFO("四国めたん");
      if (info == undefined) return;
      live2dViewer.setCurrentModel(info.id);
      await store.actions.LIVE2D_INITIALIZED({ isLive2dInitialized: true });
    }
  }

  async releaseLive2d() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;

    if (
      this.live2dViewer != undefined &&
      this.live2dViewer instanceof Live2dViewer
    ) {
      this.live2dSceneRenderer.cancelRender();
      this.live2dViewer.release();
      await this.store.dispatch("LIVE2D_INITIALIZED", {
        isLive2dInitialized: false,
      });
    }
  }

  async releaseAllLive2dModels() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;

    if (this.live2dViewer instanceof Live2dViewer) {
      this.live2dSceneRenderer.cancelRender();
      this.live2dViewer.releaseAllModel();
    }
  }

  async stopLipSync() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;
    const live2dViewer = this.live2dViewer;

    if (live2dViewer instanceof Live2dViewer) {
      const m = live2dViewer.getModelFromKey(live2dViewer.getCurrentModelKey());
      if (m == undefined) {
        return;
      }

      const Live2dMotionSyncModel = live2dTypes.Live2dMotionSyncModel;
      if (m instanceof Live2dMotionSyncModel) {
        m.stopMotionSync();
      } else {
        m.stopLipSync();
      }
    }
  }
}
