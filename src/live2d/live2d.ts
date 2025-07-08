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

export class Live2dManagerForV {
  private canvas: HTMLCanvasElement;
  private live2dManager: unknown;
  private live2dViewer: unknown;
  private isLoadedLive2dCore: boolean;
  private isFailedLive2dLoadCore: boolean;
  private store: Store;
  private live2dSceneRenderer: Live2dSceneRenderer;
  private isClicked: boolean;

  constructor(canvas: HTMLCanvasElement, store: Store) {
    this.live2dManager = undefined;
    this.live2dViewer = undefined;
    this.isLoadedLive2dCore = false;
    this.store = store;
    this.live2dSceneRenderer = new Live2dSceneRenderer();
    this.isClicked = false;
    this.isFailedLive2dLoadCore = false;
    this.canvas = canvas;

    this.onTouchesEventListenerFunction = this.onTouches.bind(this);
    this.onTouchEndEventListenerFunction = this.onTouchEnd.bind(this);
    this.onTouchMovedEventListenerFunction = this.onTouchMoved.bind(this);
  }

  getCanvas() {
    return this.canvas;
  }

  private async TouchesBegin(pageX: number, pageY: number) {
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
  private onTouches(event: PointerEvent): void {
    void this.TouchesBegin(event.pageX, event.pageY);
  }
  private onTouchesEventListenerFunction: (event: PointerEvent) => void;

  private async TouchEnd() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    if (!(this.live2dViewer instanceof Live2dViewer)) return;

    this.isClicked = false;
    this.live2dViewer.onTouchesEnded();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onTouchEnd(event: PointerEvent) {
    void this.TouchEnd();
  }
  private onTouchEndEventListenerFunction: (event: PointerEvent) => void;

  private async TouchMoved(pageX: number, pageY: number) {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;

    const Live2dViewer = live2dTypes.Live2dViewer;
    if (!(this.live2dViewer instanceof Live2dViewer)) return;

    if (this.isClicked) {
      this.live2dViewer.onTouchesMoved(pageX, pageY);
    }
  }
  private onTouchMoved(event: PointerEvent) {
    void this.TouchMoved(event.pageX, event.pageY);
  }

  private onTouchMovedEventListenerFunction: (
    this: HTMLCanvasElement,
    event: PointerEvent,
  ) => void;

  addMouseEventToLive2dCanvas() {
    this.canvas.addEventListener(
      "pointerdown",
      this.onTouchesEventListenerFunction,
      {
        passive: true,
      },
    );
    this.canvas.addEventListener(
      "pointerup",
      this.onTouchEndEventListenerFunction,
      {
        passive: true,
      },
    );
    this.canvas.addEventListener(
      "pointerleave",
      this.onTouchEndEventListenerFunction,
      {
        passive: true,
      },
    );
    this.canvas.addEventListener(
      "pointermove",
      this.onTouchMovedEventListenerFunction,
      { passive: true },
    );
  }
  removeMouseEvenet() {
    this.canvas.removeEventListener(
      "pointerdown",
      this.onTouchesEventListenerFunction,
    );
    this.canvas.removeEventListener(
      "pointerup",
      this.onTouchEndEventListenerFunction,
    );
    this.canvas.removeEventListener(
      "pointerleave",
      this.onTouchEndEventListenerFunction,
    );
    this.canvas.removeEventListener(
      "pointermove",
      this.onTouchMovedEventListenerFunction,
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

    const { Live2dManager, Live2dViewer, Live2dModel, Live2dMotionSyncModel } =
      await import("live2dmanager")
        .then((m) => {
          return {
            Live2dManager: m.Live2dManager,
            Live2dViewer: m.Live2dViewer,
            Live2dModel: m.Live2dModel,
            Live2dMotionSyncModel: m.Live2dMotionSyncModel,
          };
        })
        .catch((e) => {
          window.backend.logError(e);
          this.isFailedLive2dLoadCore = true;
          return {
            Live2dManager: undefined,
            Live2dViewer: undefined,
            Live2dModel: undefined,
            Live2dMotionSyncModel: undefined,
          };
        });

    if (
      Live2dManager == undefined ||
      Live2dViewer == undefined ||
      Live2dModel == undefined ||
      Live2dMotionSyncModel == undefined
    )
      return undefined;

    return { Live2dManager, Live2dViewer, Live2dModel, Live2dMotionSyncModel };
  }

  async initialize(width: number, height: number) {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;
    const Live2dManager = live2dTypes.Live2dManager;

    try {
      // const allocationMemory = 1024 * 1024 * 32;
      this.live2dViewer = new Live2dViewer(this.canvas, width, height);
      if (this.live2dViewer instanceof Live2dViewer) {
        this.live2dManager = new Live2dManager(this.live2dViewer);

        if (this.live2dManager instanceof Live2dManager) {
          this.live2dManager.initialize();
        }
      }
      this.isLoadedLive2dCore = true;
      await this.store.dispatch("LIVE2D_CORE_LOADED", { isLive2dLoaded: true });
    } catch (e) {
      window.backend.logError(e);
    }
  }

  async resizeViewer(width: number, height: number) {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dViewer = live2dTypes.Live2dViewer;

    try {
      /*
      const allocationMemory = 1024 * 1024 * 32;
      this.live2dViewer = new Live2dViewer(this.canvas, width, height);
      */
      if (this.live2dViewer instanceof Live2dViewer) {
        this.live2dViewer.resize(width, height);
      }
      // this.isLoadedLive2dCore = true;
      // await this.store.dispatch("LIVE2D_CORE_LOADED", { isLive2dLoaded: true });
    } catch (e) {
      window.backend.logError(e);
    }
  }

  getLive2dViewer() {
    if (!this.isLoadedLive2dCore) return undefined;

    return this.live2dViewer;
  }

  getIsLoadedLive2dCore(): boolean {
    return this.isLoadedLive2dCore;
  }

  async isExistsModelFromKey(key: string): Promise<boolean> {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return false;

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
      const model = live2dViewer.getModelFromKey(key);
      if (model != undefined) return true;
    }

    return false;
  }

  async getMotionNameList(key: string): Promise<string[]> {
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
      const model = live2dViewer.getModelFromKey(key);
      if (model != undefined) {
        return model.getMotionFileNameList();
      }
    }
    return [];
  }

  async getExpressionIdList(key: string): Promise<string[]> {
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
      const model = live2dViewer.getModelFromKey(key);
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

  public async isModelCompleteSetup(speakerId: string): Promise<boolean> {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return false;

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
      const model = live2dViewer.getModelFromKey(speakerId);
      if (model == undefined) return false;
      return model.isCompleteSetup;
    }

    return false;
  }

  async loadModel(name: string): Promise<boolean> {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return false;

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
      if (info == undefined) return false;
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
        return false;
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
        defaultExpression: info.defaultExpression,
      };
      await store.actions.LIVE2D_MODEL_INFO({
        name: name,
        info: updateInfo,
      });

      if (info.defaultExpression != undefined) {
        model.setExpression(info.defaultExpression);
      }
    }

    return true;
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
              lipSyncWait: info.lipSyncWait,
              isOldParamName: info.isOldParamName,
              defaultExpression: info.defaultExpression,
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

      /*
      const info = store.getters.LIVE2D_MODEL_INFO("四国めたん");
      if (info == undefined) return;
      live2dViewer.setCurrentModel(info.id);
      */
    }
  }

  cancelRender() {
    this.live2dSceneRenderer.cancelRender();
  }

  async releaseLive2d() {
    const live2dTypes = await this.getTypes();
    if (live2dTypes == undefined) return;
    const Live2dManager = live2dTypes.Live2dManager;

    if (
      this.live2dManager != undefined &&
      this.live2dManager instanceof Live2dManager
    ) {
      this.live2dSceneRenderer.cancelRender();
      this.live2dManager.release();
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

  async startLipSync(buf: ArrayBuffer) {
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
        await m.startMotionSync(buf);
      } else {
        await m.startLipSync(buf);
      }
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
